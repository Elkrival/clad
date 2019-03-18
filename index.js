const pupp = require('puppeteer');
const fs = require('fs');
require('dotenv').config();
const events = [ 'dialog', 'request', 'response']
const blacklist = ['www.google-analytics.com', '/gtag/js', 'ga.js', 'analytics.js'];
let browser
let test;
async function initScrape(){
    try {
        console.log('initializing headless puppeteer... ( ͡° ͜ʖ ͡°)')
        browser = await pupp.launch({ headless: false });
        console.log('launching browser page...')
        const page = await browser.newPage()
        await page.setRequestInterception(true);
        await page.setViewport({ width: 1280, height: 1307 })
        await page._client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: './'
        });
        events.forEach(eventType => {
            page.on(eventType, async (eventFilterFunc)=>{
                if(eventType === 'dialog') {
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
                        test = await eventFilterFunc.json().then(res => res);
                        console.log(test)
                        
                    }
                }
            })
        })
    await page.goto('http://localhost:8080/#/auth/login');
    console.log(page.url())
    await page.click('#email');
    await page.keyboard.type(process.env.USERNAME);
    await page.click('#password');
    await page.keyboard.type(process.env.PASSWORD);
    await page.click('#enter');
    await page.waitForSelector('#rfis')
    console.log(page.url())
    await page.click('#rfis');
    // ================ TAble  Count Tests ============
    await page.waitFor(2000);
    let table = await page.evaluate(() => document.querySelector('mat-table').children[0].childElementCount)
    console.log(table + ' ===============================');
    //======================= End Table Count ============
    await page.waitFor(3000);
    await page.click('mat-row:nth-child(2) > mat-cell.scmp-table-wideCol.mat-cell.cdk-column-campaign.mat-column-campaign.ng-star-inserted > a')
    // ============== Go back page tests after all network calls are completed =============
    await page.goBack({ networkidle0: true });
    await page.waitFor(4000);
    setTimeout(() => {
        console.log(page.url())
    }, (500));
    // File download for tables we will use fs to verify existence of file
    await page.waitForSelector('#campaigns_download');
    await page.focus('#campaigns_download');
    await page.waitFor(2000);
    await page.click('#campaigns_download');
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
    let filteredTable = await page.evaluate(() => document.querySelector('mat-table').childElementCount);
    console.log(entireTable > filteredTable, entireTable + ' entire table size ' + filteredTable + ' filtered table size');
    await page.click("#campaigns_input > input", {clickCount: 3});
    await page.waitFor(2000);
    await page.keyboard.press('Backspace');
    await page.focus('mat-header-cell > div > button');
    entireTable = await page.evaluate(() => document.querySelector('mat-table').children[1].innerText.split('Active')[0]);
    console.log(entireTable);
    await page.click('mat-header-cell > div > button');
    await page.waitFor(2000);
    await page.click('mat-header-cell > div > button');
    await page.waitFor(2000);
    filteredTable = await page.evaluate(() => document.querySelector('mat-table').children[1].innerText.split('Active')[0]);
    console.log(filteredTable)
    console.log(entireTable === filteredTable);
    console.log(filteredTable.valueOf() === filteredTable.valueOf());
    await fs.unlink(__dirname + '/Campaigns.csv', (err) =>{
        return err ? console.error(err.message) : console.log('file is removed');
    })
    await page.click('mat-header-cell > div > button');
    await page.waitFor(5000);
    // ================== Navigate from Table Item ==============
    await page.evaluate(() => document.querySelector('mat-table > mat-row:nth-child(9)').children[0].children[0].click());
    await page.waitFor(2000);
    // await browser.close()
    await console.log('shutting down puppeteer... ʕ •ᴥ•ʔ');
    
    }catch(err) {
        console.error(err.message);
        await browser.close()
    }
};
initScrape()