import { test, expect } from "@playwright/test";
import { randomTimeout } from "../Helpers/helpers";

const CANDIDATE_NAME = process.env.CANDIDATE_NAME;
const VOTE_URL = process.env.VOTE_URL;

// Fail fast if required secrets are missing
if (!CANDIDATE_NAME || !VOTE_URL) {
  throw new Error(
    "❌ Missing required environment variables: CANDIDATE_NAME and/or VOTE_URL"
  );
}

test.describe.configure({ mode: "serial" });

async function getDiff(page) {
  const items = page.locator('//div[contains(@id,"appointment-2")]//ul/li');
  const count = await items.count();

  let X = 0;
  let Y = 0;

  for (let i = 0; i < count; i++) {
    const text = await items.nth(i).innerText();
    const trimmed = text.trim();

    const match = trimmed.match(/^(\d+)/);
    if (!match) continue;

    const num = parseInt(match[1], 10);

    if (trimmed.includes(CANDIDATE_NAME)) {
      Y = num;
    } else {
      if (num > X) {
        X = num;
      }
    }
  }

  return { X, Y, diff: Y - X };
}

async function doVote(page) {
  await page.goto(VOTE_URL);

  const firstTimeout = randomTimeout();
  await page.waitForTimeout(firstTimeout);

  await page.click(
    '(//div[contains(@class,"advpoll-result")])[2]//a[contains(text(),"Back")]'
  );

  const secondTimeout = randomTimeout();
  await page.waitForTimeout(secondTimeout);

  await page.click(`//li//label[contains(text(),"${CANDIDATE_NAME}")]`);

  const thirdTimeout = randomTimeout();
  await page.waitForTimeout(thirdTimeout);

  await page.click('//a[contains(text(),"Vote")]');

  await expect(
    page.locator('//span[contains(text(),"Ste že glasovali")]')
  ).toBeVisible();
}

test.describe("Vote", () => {
  let maxVotes = 0;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto(VOTE_URL);

    const { diff } = await getDiff(page);
    console.log("Initial diff:", diff);

    if (diff < 100) {
      maxVotes = Math.min(50, 100 - diff);
      console.log(`Need up to ${maxVotes} votes`);
    } else {
      console.log("Already >= 100 ahead, no votes scheduled.");
    }

    await page.close();
  });

  for (let i = 0; i < 50; i++) {
    test(`Vote attempt #${i + 1}`, async ({ page }) => {
      if (i >= maxVotes) test.skip();
      await doVote(page);
    });
  }
});
