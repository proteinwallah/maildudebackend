const { OpenRouter } = require('@openrouter/sdk');
const { callModel, tool } = require('@openrouter/agent');
const { z } = require('zod');
//Scraping
const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');

const openRouter = new OpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });

const sumTwoNumbers = tool({
  name: 'web_search1',
  description: 'Extracts content from a specific, fully-qualified web URL provided directly in the text. Do NOT use this for general internet queries or web searches without a direct link.',
  inputSchema: z.object({
    startUrl1: z.string().describe('The complete  HTTPS URL to scrape (e.g., https://example.com)'),
     maxPages1 : z.number().describe('Maximum pages to scrape. Default is 1.'),
  }),
  execute: async function web_search1({startUrl1,maxPages1 = 1}) {
//browser in bg invisible
let browser1;
try{
  browser1 = await puppeteer.launch({
args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  const queue1 = [startUrl1];
  //unique links and to avoid re visit of the same links again 
  const visitedLinks1 = new Set();
const siteData1 = [];

//Origin without any / slashes or other page go to main page
const baseOrigin1 = new URL(startUrl1).origin;

//Loop till no oen is in que and untile it has not reach limit of maxpage
while(queue1.length > 0 && visitedLinks1.size < maxPages1)
{
  const currentUrl1 = queue1.shift();

//skip link if already visite real use of visitedLinks
if(visitedLinks1.has(currentUrl1)) continue;

//Makr current url as visited once its done
visitedLinks1.add(currentUrl1);

const page1 = await browser1.newPage();
page1.setDefaultNavigationTimeout(60000)
try{
await page1.goto(currentUrl1,{waitUntil:'domcontentloaded',timeout:30000});

const title1 = await page1.title();

const text1 = await page1.evaluate(()=>document.body.innerText.trim());

//Link extractions

const internalLinks1 = await page1.evaluate((origin1)=>
{
return Array.from(document.querySelectorAll('a[href]'))
.map(a1 => a1.href)
.filter(href1 => href1.startsWith(origin1))
.map(href1=> href1.split('#')[0]);

},baseOrigin1);

siteData1.push({
  url:currentUrl1,
  title:title1,
  text:text1,
  content:text1.length,
  discoverLinks:internalLinks1,
  pages:internalLinks1.length,
})

console.log(siteData1);

for(const link1 of internalLinks1)
{
  if(!visitedLinks1.has(link1) && !queue1.includes(link1))
  {
    queue1.push(link1)
  }
}


}

catch(err1)
{
return err1.message
}
finally{
  //close individual tab to preserve ram
  await page1.close()
}

//res.status(201).json({
//  message:`Successfully read your site 👍 Title:- ${siteData.title} , 👍 Content length:- ${siteData.content} 👍 Total pages :- ${siteData.pages}`,
//  type:'success',
//  devModeData:siteData,
//})


}

return {
  title:siteData1[0].title,
  url:siteData1[0].url,
  content:siteData1[0].text,
  internalLinks:siteData1[0].discoverLinks
};
}
catch(err1)
{
  return err1.message
}


}
});

async function main() {
  const result = callModel(openRouter, {
    model: 'nvidia/nemotron-3.5-super-vl:free',
    instructions: 'You are a helpful assistant.',
    input: 'What is https://www.omtechsoftware.com/ is about if there is an error returning from the tool please state that error too',
    tools: [sumTwoNumbers],
  });

  console.log(await result.getText());
}

main().catch(console.error);