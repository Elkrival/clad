const pupp = require('puppeteer');
const fs = require('fs');
require('dotenv').config();
const events = [ 'dialog', 'request', 'response', 'popup']
const blacklist = ['www.google-analytics.com', '/gtag/js', 'ga.js', 'analytics.js'];
let browser
let test;
let campaignSubject;
let pageOrigin;
let vendorSubject;
async function initScrape(){
    try {
        console.log('initializing headless puppeteer... ( ͡° ͜ʖ ͡°)')
        browser = await pupp.launch({ headless: true }) //, args: ['--window-size=1440,900', '--start-maximized'] });
        console.log('launching browser page...')
        const page = await browser.newPage();
        await page.setViewport({ height: 900, width: 1440 })
        await page.setRequestInterception(true);
        // await page.setViewport({ width: 1280, height: 1000 })
        await page._client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: './'
        });
        events.forEach(eventType => {
            page.on(eventType, async (eventFilterFunc)=>{
                if(eventType === 'dialog') {
                    console.log('dialog box')
                    console.log(eventFilterFunc + ' dialog =============== ')
                    return eventFilterFunc.accept()
                } else if(eventType === 'request') {
                    if (blacklist.find(regex => eventFilterFunc.url().match(regex))) {
                        return eventFilterFunc.abort();
                    }else{
                        return  eventFilterFunc.continue();
                    }
                }else if(eventType === 'response') {
                    if(eventFilterFunc.url().includes('client')) {
                        // resolves data result from request
                        if(eventFilterFunc.url().includes('/client/rfis/templates/')) {
                            let data = await eventFilterFunc.json().then(res => res);
                            console.log(data.hasOwnProperty('campaignTable'), 'verification');
                            console.log(data, '================ Data ================$$$$$$')
                            if(data.hasOwnProperty('campaignTable')) {
                                test = data
                                campaignSubject = data.campaignTable[1];
                            }
                        }
                        if(eventFilterFunc.url().includes('client/group/data/')) {
                            await eventFilterFunc.json().then(res => vendorSubject =  res.result);
                            
                        }
                        
                    }
                }else if(eventType === 'popup') {
                    console.log('popup');
                    console.log(eventFilterFunc)
                }
            })
        })
    await page.goto('http://localhost:8080/#/auth/login');
    console.log(page.url())
    await page.click('#loginEmail');
    await page.keyboard.type(process.env.USERNAME);
    await page.click('#loginPassword');
    await page.keyboard.type(process.env.PASSWORD);
    await page.click('#enter');
    await page.waitForSelector('#rfis')
    console.log(page.url())
    await page.click('#rfis');
    // ================ TAble  Count Tests ============
    await page.waitFor(2000);
    let table = await page.evaluate(() => document.querySelector('mat-table').children[0].childElementCount)
    console.log(table + 'count')
    //======================= End Table Count ============
    await page.waitFor(3000);
    await page.click('mat-row:nth-child(2) > mat-cell.scmp-table-wideCol.mat-cell.cdk-column-campaign.mat-column-campaign.ng-star-inserted > a')
    // ============== Go back page tests after all network calls are completed =============
    await page.goBack({ networkidle0: true });
    await page.waitFor(200);
    setTimeout(() => {
        console.log(page.url() + ' ======URL=====')
    }, (500));
    // File download for tables we will use fs to verify existence of file
    await page.waitForSelector('#campaigns_download');
    await page.focus('#campaigns_download');
    await page.waitFor(2000);
    await page.click('#campaigns_download');
    // Test snack bar download sucess
    let snack = await page.evaluate(() => document.querySelector('body > div.cdk-overlay-container').innerText.toLowerCase().includes('download successful'));
    console.log(snack + ' SnackBar ^^^^^^^&&&&&&&&')
    // end snack bar
    await page.waitFor(4000);
    let a = await fs.readFile(__dirname + '/Campaigns.csv', (err, data) =>{
        if(err) {
            console.error(err);
        }
        else if (data){
            let dataToString = data.toString()
            const { campaign_name } = test.campaignTable[7];
            let final = dataToString.includes(campaign_name);
            console.log(final)
        }
    });
    // ====================== Sorting and Filtering ======================
    let entireTable = await page.evaluate(() => document.querySelector('mat-table').childElementCount);
    await page.focus('#campaigns_input > input');
    await page.keyboard.type('leather');
    let searchResult = await page.evaluate((query) => document.querySelector('mat-cell').innerText.toLowerCase().includes(query), 'leather')
    console.log(searchResult + ' Macy Gray =============== ')
    let filteredTable = await page.evaluate(() => document.querySelector('mat-table').childElementCount);
    console.log(entireTable > filteredTable, entireTable + ' entire table size ' + filteredTable + ' filtered table size');
    await page.click("#campaigns_input > input", {clickCount: 3});
    await page.waitFor(500);
    await page.keyboard.press('Backspace');
    await page.focus('mat-header-cell > div > button');
    entireTable = await page.evaluate(() => document.querySelector('mat-table').children[1].innerText.split('Active')[0]);
    console.log(entireTable + ' Sorting Value');
    await page.click('mat-header-cell > div > button');
    await page.waitFor(500);
    await page.click('mat-header-cell > div > button');
    await page.waitFor(500);
    filteredTable = await page.evaluate(() => document.querySelector('mat-table').children[1].innerText.split('Active')[0]);
    console.log(entireTable.valueOf() === filteredTable.valueOf() + ' Comparison of table values ===========');
    await fs.unlink(__dirname + '/Campaigns.csv', (err) =>{
        return err ? console.error(err.message) : console.log('file is removed');
    })
    await page.click('mat-header-cell > div > button');
    await page.waitFor(5000);
    // ================== Navigate from Table Item ==============
    await page.evaluate(() => document.querySelector('mat-table > mat-row:nth-child(9)').children[0].children[0].click());
    await page.waitFor(500);
    console.log(campaignSubject);

    // Campaign Page evaluator tests
    let header = await page.evaluate(() => document.querySelector('.scmp-page-title > span').innerText.toLowerCase());
    console.log(header === campaignSubject.campaign_name.toLowerCase());
    await page.click('#addVendor');
    await page.waitFor(500);
    // await page.click('#selectVendor > div');
    // await page.waitFor(2000);
    // await page.evaluate(() => document.querySelector('.mat-select-content').children[0].click());
    // await page.waitFor(2000);
    // await page.click('mat-dialog-container');
    // await page.waitFor(2000);
    // await page.click('#vendorSubmit');
    await page.click('#close');
    await page.waitFor(500);
    pageOrigin = await page.url()
    let reg = await page.evaluate(() => document.querySelector('div > .pointer-end').innerText);
    console.log(reg, campaignSubject.groups_responding);
    console.log(parseFloat(reg) > parseFloat(campaignSubject.groups_responding))
    await page.waitFor(500);
    await page.click('#surveyTable > mat-row:nth-child(2) > mat-cell.mat-cell.cdk-column-vendor.mat-column-vendor.ng-star-inserted > div > a');
    await page.waitFor(500);
    //navigation verification
    let navigated = await page.url();
    console.log(navigated === pageOrigin);
    const { answers, counts, details, group, pending, roles, users } = vendorSubject;
    console.log(vendorSubject, ' ================ V E N D O R - D A T A  ==========')
    // Edit vendor
    console.log('edit vendor')
    await page.focus('#editVendor');
    await page.click('#editVendor');
    await page.waitForSelector('#vendorName');
    let preName = await page.evaluate(() => document.querySelector('#vendorName').value);
    console.log(group.address)
    console.log(preName.valueOf() === group.name.valueOf());
    let preAddress = await page.evaluate(() => document.querySelector('#vendorAddress').value);
    console.log(preAddress.valueOf() === group.address.valueOf());
    await page.waitFor(500);
    await page.focus('#vendorDescription');
    await page.click('#vendorDescription');
    await page.keyboard.type('Beauty Products for all');
    await page.click('#editSubmit');
    // Edit Vendor snackbar
    await page.waitFor(1000);
    let editSnack = await page.evaluate(() => document.querySelector('simple-snack-bar').innerText.toLowerCase().includes('group'));
    console.log(editSnack + ' - snack - bar - edit vendor -')
    //Add campaign to vendor
    console.log('add campaign')
    await page.waitFor(500);
    await page.click('#addCampaign');
    await page.waitFor(500);
    await page.click('#selectCampaign > div');
    await page.waitFor(500);
    await page.evaluate(() => document.querySelector('mat-option').children[0].click());
    await page.waitFor(500);
    await page.click('#close');
    await page.click('#close');
    await page.waitFor(500);
    let vendorCampaignList = await page.evaluate((groupList) => document.querySelector('#groupCampaignList').childElementCount - 2 === groupList, details.length);
    console.log(vendorCampaignList);
    await page.waitFor(500);
    await page.click('#addCampaign');
    await page.waitFor(500);
    await page.click('#selectCampaign > div');
    await page.waitFor(500);
    await page.evaluate(() => document.querySelector('mat-option').children[0].click());
    await page.waitFor(500);
    await page.click('#close');
    await page.click('#close');
    await page.waitFor(1000);
    //Invite User
    console.log('invite user')
    await page.click('#inviteUser');
    await page.focus('form > div > div > input');
    await page.keyboard.type(process.env.INVITE_EMAIL);
    await page.waitFor(500);
    await page.evaluate(() => document.querySelector('mat-radio-group').children[0].firstElementChild.click());
    await page.waitFor(2000);
    await page.click('#sendInvite');
    await page.waitFor(2000);
    let snackCampaign = await page.evaluate(() => document.querySelector('simple-snack-bar').innerText.toLowerCase().includes('been invited'));
    console.log(snackCampaign + ' snack - bar - campaign')
    //Delete from table
    await page.waitFor(500);
    await page.click('#surveyDelete_0');
    await page.waitFor(500);
    let surveyTable = await page.evaluate(() => document.querySelector('#surveyTable').childElementCount); 
    console.log(answers.length > surveyTable, 'After - delete - survey table');
    // Delete from user table
    await page.waitFor(500);
    await page.click('#userDelete_0');
    await page.waitFor(500);
    await page.click('#dialogCancel');
    let userTable = await page.evaluate(() => document.querySelector('#userTable').childElementCount - 1);
    console.log(userTable === users.length)
    await page.waitFor(500);
    // Edit Role From Table
    console.log('edit roles')
    let text = await page.evaluate(() => document.querySelector('#invitedUsers').children[1].children[2].children[0].children[0].children[0].innerText);
    console.log(typeof text, ' type of text')
    await page.waitFor(1000);
    await page.evaluate(() => document.querySelector('#invitedUsers').children[1].children[2].children[0].children[0].children[0].click());
    await page.waitFor(1000);
    
    let id = selector(text);
    console.log(id);
    await page.waitFor(1000);
    await page.evaluate((option) =>  document.querySelector('.mat-select-content').children[option].click(), id)
    await page.waitFor(1000);
    console.log(selector(text), 'selector option')
    let newRole = await page.evaluate(() => document.querySelector('#invitedUsers').children[1].children[2].children[0].children[0].children[0].innerText);
    console.log(newRole, text, 'Invited Users Options')
    // await browser.close()
    console.log('shutting down puppeteer... ʕ •ᴥ•ʔ');
    
    }catch(err) {
        console.log(err.stack)
        console.error(err.message);
        await browser.close()
    }
};
initScrape()
function selector(type){
    console.log(type === 'Admin', 'terniary')
    return (type.valueOf().toLowerCase() === 'admin' ? 1 : 0)
}