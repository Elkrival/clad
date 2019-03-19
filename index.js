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
        browser = await pupp.launch({ headless: false, args: ['--window-size=1080,1800', '--start-maximized'] });
        console.log('launching browser page...')
        const page = await browser.newPage();
        // await page.setViewport({ height: 1080, width: 1800 })
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
    let header = await page.evaluate(() => document.querySelector('.scmp-page-title--secondary').innerText.toLowerCase());
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
    let reg = await page.evaluate(() => document.querySelector('.pointer-end').innerText);
    console.log(reg, campaignSubject.groups_responding);
    console.log(parseFloat(reg) > parseFloat(campaignSubject.groups_responding))
    await page.waitFor(500);
    await page.click('#surveyTable > mat-row:nth-child(2) > mat-cell.mat-cell.cdk-column-vendor.mat-column-vendor.ng-star-inserted > a');
    await page.waitFor(500);
    let navigated = await page.url();
    console.log(navigated === pageOrigin)
    await page.waitFor(500);
    await page.click('#addCampaign');
    await page.waitFor(500);
    await page.click('#selectCampaign > div');
    await page.waitFor(500);
    await page.evaluate(() => document.querySelector('mat-option').children[0].click());
    await page.waitFor(500);
    await page.click('#close');
    await page.click('#close');
    const { answers, counts, details, group, pending, roles, users } = vendorSubject; 
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
    await page.click('#inviteUser');
    await page.focus('form > div > div > input');
    await page.keyboard.type(process.env.INVITE_EMAIL);
    await page.waitFor(500);
    await page.evaluate(() => document.querySelector('mat-radio-group').children[0].firstElementChild.click());
    await page.waitFor(2000);
    await page.click('#sendInvite');
    await page.waitFor(2000);
    let snackCampaign = await page.evaluate(() => document.querySelector('snack-bar-container').innerText.includes('has been invited'));
    console.log(snackCampaign + ' snack - bar - campaign')

    // await browser.close()
    await console.log('shutting down puppeteer... ʕ •ᴥ•ʔ');
    
    }catch(err) {
        console.error(err.message);
        await browser.close()
    }
};
initScrape()