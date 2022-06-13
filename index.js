const puppeteerExtra = require('puppeteer-extra');
const stealthPlugin = require('puppeteer-extra-plugin-stealth');

require('dotenv').config()
const username = process.env.username
const password = process.env.password
let wordHandler, energyHandler, numOfEnergy_text, numOfEnergy_integer;

let getWord = async (dw, page) => {
    try {
        if (dw == null) {
            wordHandler = await page.waitForSelector('#quoteDisplay', { visible: true }) 
        } else {
            await page.waitForFunction(`document.getElementById('quoteDisplay').innerText != '${dw}'`, { timeout: 15000 });
        }
    } catch (e) {
        return null;
    }
    try {
        let word = await wordHandler.evaluate(w => w.innerText);
        return word;
    } catch (e) {
        return null;
    }
}

let isGameOver = async (page) => {
    return await page.evaluate(() => {
        if (document.getElementsByClassName('swal2-confirm').length != 0) {
            return true;
        } else {
            return false;
        }
    })
}

let getEnergy = async (page) => {
    // GET # of Energy
    energyHandler = await page.$('.energy-left')
    numOfEnergy_text = await energyHandler.evaluate(el => el.innerText)
    numOfEnergy_integer = parseInt(numOfEnergy_text.match(/\d+/)[0])
    // console.log(numOfEnergy_text)
    // console.log("Starting now...")
    // END ENERGY
}

let login = async (page) => {
    await page.goto("https://freelancesage.com/oauth/google");
    await page.type('[type="email"]', username)
    await page.click('#identifierNext');
    await page.waitForTimeout(2000);
    await page.type('[type="password"]', password) 
    await page.click('#passwordNext');
    await page.waitForNavigation({ timeout: 10000 });
}

;(async() => {
    try {
        puppeteerExtra.use(stealthPlugin()); 
        const browser = await puppeteerExtra.launch({ headless: process.env.headless || false });
        const page = (await browser.pages())[0];
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0");
        await login(page); // Log user
        console.log(`Successfully logged in as: ${username}`);
        await page.goto("https://freelancesage.com/play");
        await page.waitForTimeout(1000); // Timeout 1s
        await getEnergy(page) // Get the remaining amount of energy

        for (let i = 0; i < numOfEnergy_integer; i++) {
            if (i == 0) {
                console.log("=================================================");
                console.log(numOfEnergy_text)
                console.log("=================================================");
            } else {
                await page.reload();
                await page.waitForTimeout(1000); // Timeout 1s
                await getEnergy(page);
                console.log("=================================================");
                console.log(numOfEnergy_text)
                console.log("=================================================");
            }


            await page.evaluate(() => { // Click the button
                document.getElementById('start-btn').click();
            })

            let wrd = await getWord(null, page);
            console.log(" - - - - STARTING NEW GAME! - - - - ");
            for (let k = 0;;k++) { 
                if (await isGameOver(page)) {
                    await page.waitForSelector('.swal2-confirm', { visible: true }).then(el => {
                        el.click();
                    })
                    await page.waitForTimeout(800); // Wait atleast 800ms
                    await page.waitForSelector('.total_points', { visible: true }).then(async (el) => {
                        points = await el.evaluate(k => k.innerText);
                        console.log(`~~~ Game Over! You won ${points} points ~~~`);
                    })
                    break;
                }
                if (k >= 1) {
                    wrd = await getWord(wrd, page);
                }
                if ((k % 10) == 0) {
                    console.log(`[${k}] - ${wrd}`)
                }
                try {
                    await page.type('#quoteInput', wrd);
                } catch (e) {
                    console.log("Can't type anymore so skipping loop");
                    continue;
                }
            }
        }

        await browser.close()

    } catch (e) {
        console.error(e);
    }

})();
