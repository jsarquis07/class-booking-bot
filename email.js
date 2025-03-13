require('dotenv').config();
const puppeteer = require('puppeteer');

let consoleLogs = []; // Array to store console logs

function log(message) {
    consoleLogs.push(message);
    console.log(message);
}

function getTargetTime() {
    const now = new Date();
    const targetDate = new Date();
    
    // On ajoute 5 jours pour avoir la date de réservation
    targetDate.setDate(targetDate.getDate() + 5);
    
    // On force l'heure à 11h00
    targetDate.setHours(11, 0, 0, 0);

    log(`Date cible: ${targetDate.toLocaleString()}`);
    return targetDate;
}

function calculateDelays(targetDate) {
    // En mode test, pas de délais
    if (process.env.TEST_MODE === 'true') {
        return {
            loginDelay: 0,
            clickDelay: 0
        };
    }

    const now = new Date();
    const loginTime = new Date(targetDate);
    const clickTime = new Date(targetDate);

    loginTime.setMinutes(loginTime.getMinutes() - parseInt(process.env.LOGIN_BEFORE));
    clickTime.setSeconds(clickTime.getSeconds() + parseInt(process.env.CLICK_AFTER));

    return {
        loginDelay: Math.max(0, loginTime - now),
        clickDelay: Math.max(0, clickTime - now)
    };
}

async function loginAndClickClass() {
    const browser = await puppeteer.launch({ 
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--disable-gpu',
            '--single-process'
        ]
    });
    const page = await browser.newPage();

    async function loadPage(url, retries = 3) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                log(`Attempting to load ${url}, attempt ${attempt}...`);
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
                log(`${url} loaded successfully.`);
                return;
            } catch (error) {
                log(`Error loading ${url} (attempt ${attempt}): ${error}`);
                if (attempt === retries) {
                    throw new Error(`Failed to load ${url} after ${retries} attempts.`);
                }
            }
        }
    }

    try {
        const targetDate = getTargetTime();
        const { loginDelay, clickDelay } = calculateDelays(targetDate);

        log(`Cible: ${targetDate.toLocaleString()}`);
        log(`Connexion dans ${Math.floor(loginDelay/1000)} secondes`);
        log(`Réservation dans ${Math.floor(clickDelay/1000)} secondes`);

        // Attendre le moment de la connexion
        if (loginDelay > 0) {
            await new Promise(resolve => setTimeout(resolve, loginDelay));
        }

        // Step 1: Log in
        await loadPage(`${process.env.WEBSITE_URL}/dashboard/`);

        const email = process.env.EMAIL;
        const password = process.env.PASSWORD;

        if (!email || !password) {
            throw new Error('Email or password not found in environment variables');
        }

        await page.type('#connexion_email', email);
        await page.type('#connexion_password', password);
        await page.click('#btn-connexion');
        await page.waitForSelector('#account__logout', { timeout: 15000 });
        log('Login successful!');

        // Step 2: Navigate to planning page
        await loadPage(`${process.env.WEBSITE_URL}/planning/`);

        // Step 3: Wait for classes to load
        await page.waitForSelector('.planning__box', { timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        log('Page loaded. Searching for the specific class...');

        // Format de la date pour la recherche
        const targetDateString = targetDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
        const targetTimeString = targetDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        log(`Target date: ${targetDateString} at ${targetTimeString}`);

        // Find the specific class based on date and time
        const uniqueClassId = await page.evaluate((targetDateString, targetTimeString) => {
            const classElements = document.querySelectorAll('.planning__box');

            for (let el of classElements) {
                const dateElement = el.querySelector('.planning__event-date');
                const timeElement = el.querySelector('.planning__event-time');
                const nameElement = el.querySelector('.planning__event-name');

                if (
                    dateElement &&
                    timeElement &&
                    nameElement &&
                    dateElement.textContent.trim().endsWith(targetDateString) &&
                    timeElement.textContent.trim().startsWith(targetTimeString) &&
                    ["hard training", "bootcamp", "cross training"].includes(nameElement.textContent.trim().toLowerCase())
                ) {
                    const onclickValue = el.getAttribute('onclick');
                    const match = onclickValue.match(/show_detail\((\d+),/);
                    if (match) {
                        return match[1];
                    }
                }
            }
            return null;
        }, targetDateString, targetTimeString);

        if (!uniqueClassId) {
            log('Class not found based on the specific criteria!');
            return;
        }

        log(`Class found! Unique ID: ${uniqueClassId}`);

        const classClicked = await page.evaluate((uniqueClassId) => {
            const classElement = document.querySelector(`.planning__box[onclick*=\"show_detail(${uniqueClassId},\"]`);
            if (classElement) {
                classElement.click();
                return true;
            }
            return false;
        }, uniqueClassId);

        if (classClicked) {
            log(`Class with ID ${uniqueClassId} clicked.`);

            // Attendre le moment de la réservation
            if (clickDelay > 0) {
                log(`Waiting until ${new Date(Date.now() + clickDelay).toLocaleString()} to click the reserve button...`);
                await new Promise(resolve => setTimeout(resolve, clickDelay));
            }

            await page.waitForSelector(`button[onclick=\"go_subscribe(${uniqueClassId});\"]`, { timeout: 5000 });
            await page.click(`button[onclick=\"go_subscribe(${uniqueClassId});\"]`);
            log('Reserve button clicked.');
        } else {
            log('Class not found!');
        }
    } catch (error) {
        log(`Error: ${error}`);
        process.exit(1);
    } finally {
        log('Script completed. Closing browser...');
        await browser.close();
        log('Browser closed.');
        process.exit(0);
    }
}

// Exécuter immédiatement car GitHub Actions gère le timing
loginAndClickClass();
