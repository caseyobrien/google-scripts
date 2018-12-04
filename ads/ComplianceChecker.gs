/**
 * @name AdGrants Checker
 *
 * @overview Checks account structure and click through rate for compliance
 *           with Google AdGrants requirements. See 
 *           https://support.google.com/grants/answer/117827?hl=en
 *           for the documented requirements (retrieved 2018-03-27). Also, 
 *           checks for single word keywords and any keywords with a quality
 *           score <= 2. See. 
 *           https://support.google.com/grants/answer/117827?hl=en&ref_topic=3500093
 *
 * @author casey j. o'brien [casey@rootedinmindfulness.org]
 *
 * @version 1.3
 *
 * @changelog
 *  - version 1.3
 *.   - Added sending email of log.
 *  - version 1.2
 	  - Added check for broken links in ads and sitelink extensions.
 *	- version 1.1
 *    - Added checks for single word keywords and keywords with quality score <= 2.
 * - version 1.0
 *    - Released initial version.
 * 
 */

function main() {
  checkCtr();
  checkSitelinkExtensions();
  checkGeoTargeting();
  checkLinks();
  
  var enabledCampaigns = AdWordsApp.campaigns()
	.withCondition("Status = ENABLED")
  	.get();
  
  while (enabledCampaigns.hasNext()) {
  	var campaign = enabledCampaigns.next();
    checkCampaign(campaign);
  }
  
  checkKeywords();

  var recipient = 'casey@rootedinmindfulness.org';
  var subject = 'RIM AdGrants Account Checker';
  var body = Logger.getLog();
  MailApp.sendEmail(recipient, subject, body);
}

function checkCampaign(campaign) {
  // CHECK: At least two active (enabled) ad groups
  adGroups = campaign.adGroups()
    .withCondition("Status = ENABLED").get();
  adGroupsCounter = 0;
  while (adGroups.hasNext()) {
    adGroup = adGroups.next();
    checkAdGroup(adGroup);
    adGroupsCounter++;
  }
  
  if (adGroupsCounter >= 2) 
    Logger.log("[PASS]: Campaign " + campaign.getName() + " has at least TWO active ad groups.");
  else
    Logger.log("[FAIL]: Campaign " + campaign.getName() + " only has " + adGroupsCounter + " active ad group(s). Need at least TWO.");
    
}

function checkAdGroup(adGroup) {
  // CHECK: Two active (enabled) text ads. 
  ads = adGroup.ads()
    .withCondition("Status = ENABLED")
  	.withCondition("Type IN [TEXT_AD, EXPANDED_TEXT_AD]")
  	.get();
  adCounter = 0;
  while (ads.hasNext()) {
    ad = ads.next();
    adCounter++;
  }
  
  if (adCounter >= 2) 
    Logger.log("[PASS]: AdGroup " + adGroup.getName() + " has at least TWO active text ads.");
  else
    Logger.log("[FAIL]: AdGroup " + adGroup.getName() + " only has " + adCounter + " active text ads. Need at least TWO.");
}

function checkSitelinkExtensions() {
  // CHECK: Account has at least two sitelink extensions.
  var sitelinks = AdWordsApp.extensions()
    .sitelinks()
    .get();
  
  sitelinkCounter = 0;
  while(sitelinks.hasNext()) {
    sitelink = sitelinks.next(); 
    sitelinkCounter++;
  }
  
  if (sitelinkCounter >= 2) 
    Logger.log("[PASS]: Account has at least TWO sitelink extensions.");
  else
    Logger.log("[FAIL]: Account only has " + sitelinkCounter + " sitelink extensions. Need at least TWO.");
}

function checkGeoTargeting() {
  // CHECK: Geo-targeting enabled. 
  var targetLocations = AdWordsApp.targeting().targetedLocations().get();
  
  if (targetLocations.totalNumEntities() >= 1) {
    Logger.log("[PASS]: Account uses geo-targeting.");
  } else {
    Logger.log("[FAIL]: Account does NOT use geo-targeting.");
  }
}

function checkCtr() {
  // CHECK: Click through rate for last 30 days >= 5%.
  // CHECK: Click through rate for last month >= 5%. 
  var ctr30Days = AdWordsApp.currentAccount().getStatsFor("LAST_30_DAYS").getCtr();
  var ctrLastMonth = AdWordsApp.currentAccount().getStatsFor("LAST_MONTH").getCtr();
  if (ctr30Days >= 0.05) {
    Logger.log("[PASS]: Account CTR for last 30 days is " + (ctr30Days * 100).toFixed(2) + "%.");
  } else {
   	Logger.log("[FAIL]: Account CTR for last 30 days is " + (ctr30Days * 100).toFixed(2) + "%."); 
  }
  if (ctrLastMonth >= 0.05) {
    Logger.log("[PASS]: Account CTR for last month is " + (ctrLastMonth * 100).toFixed(2) + "%.");
  } else {
   	Logger.log("[FAIL]: Account CTR for last month is " + (ctrLastMonth * 100).toFixed(2) + "%."); 
  }
}

function checkKeywords() {
  // CHECK: No (enabled) keywords with quality score <= 2.
  var problemKeywords = AdWordsApp.keywords()
    .withCondition("QualityScore <= 2")
    .withCondition("Status = ENABLED")
    .withCondition("AdGroupStatus = ENABLED")
    .withCondition("CampaignStatus = ENABLED").get();
  var problemKeywordsCounter = 0;
  while (problemKeywords.hasNext()) {
    var keyword = problemKeywords.next();
    Logger.log("[FAIL]: Keyword \"" + keyword.getText() + "\" has a quality score of " + keyword.getQualityScore() + ". (Must be > 2)");
    problemKeywordsCounter++;
  }
  
  if (problemKeywordsCounter <= 0) {
    Logger.log("[PASS]: All keywords have quality scores greater than 2 (or no quality score)."); 
  }
  
  // CHECK: No (enabled) single-word keywords. 
  var singleKeywords = AdWordsApp.keywords()
    .withCondition("Text DOES_NOT_CONTAIN ' '")
    .withCondition("Status = ENABLED")
    .withCondition("AdGroupStatus = ENABLED")
    .withCondition("CampaignStatus = ENABLED").get();
  var singleKeywordCounter = 0;
  while (singleKeywords.hasNext()) {
    var keyword = singleKeywords.next();
    Logger.log("[FAIL]: Keyword \"" + keyword.getText() + "\" (AdGroup: " + keyword.getAdGroup().getName() + ") is a single word keyword.");
    singleKeywordCounter++;
  }
  
  if (singleKeywordCounter <= 0) {
    Logger.log("[PASS]: No single word keywords."); 
  }
}


function checkLinks () {
  // CHECK: No broken links.
  
  // Check ads.
  var ads = AdWordsApp.ads()
  	.withCondition("Status = ENABLED")
    .withCondition("AdGroupStatus = ENABLED")
    .withCondition("CampaignStatus = ENABLED").get();
  var adsWithBrokenLinks = 0;
  while (ads.hasNext()) {
   	var ad = ads.next();
    if (UrlFetchApp.fetch(ad.urls().getFinalUrl(), { 'muteHttpExceptions': true}).getResponseCode() != 200) {
    	Logger.log("[FAIL]: URL for ad with headline " + ad.getHeadlinePart1() + " has a broken link.");
    	adsWithBrokenLinks++;
    }
  }
  
  if (adsWithBrokenLinks <= 0) {
  	Logger.log("[PASS]: All ad links working."); 
  }
  
  // Check sitelinks.
  var sitelinkExtensions = AdWordsApp.extensions().sitelinks()
  	.get();
  var sitelinksWithBrokenLinks = 0;
  while (sitelinkExtensions.hasNext()) {
   	var sle = sitelinkExtensions.next();
    if (UrlFetchApp.fetch(sle.urls().getFinalUrl(), { 'muteHttpExceptions': true}).getResponseCode() != 200) {
      Logger.log("[FAIL]: URL for sitelink extension with text " + sle.getLinkText() + " has a broken link.");
      sitelinksWithBrokenLinks++;
    }
  }
  
  if (sitelinksWithBrokenLinks <=0) {
   	Logger.log("[PASS]: All sitelink extensions links working.");  
  }
  
}