require('dotenv').config();
const express = require('express');
const app = express();
const { Pool } = require('pg');
//const Bcrypt = require('bcryptjs'); // pwd hashing
const Cryptr = require('cryptr'); // Encryption of one time pwds
const cryptr = new Cryptr(process.env.MASTER_KEY_API);
const nodemailer = require('nodemailer');
//const Cryptor = require('crypto');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const {GoogleGenAI , Type} = require('@google/genai');
const puppeteer = require('puppeteer');
//const redis = require('redis');
const { createClient } = require('redis');

const saltRounds = 12;

// Secure
app.use(cors());



// Database Connection
const pool = new Pool({
  connectionString: process.env.SUPABASEPOSTGRE,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
});

app.use(express.json());

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 7,                 // 7 requests per IP per window
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 56,
  handler: (req, res) => {
    res.status(429).json({
      message: 'Too many requests. Please try again after 15 minutes.',
      type: 'error'
    });
  },
});

// Node mailer email sending
async function sendEmail(email, template) {
  // Create a transport with your SMTP server settings
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // true for port 465
    auth: {
      user: process.env.GOOGLE_MAIL,
      pass: process.env.GOOGLE_PASS
    }
  });

  // Send an email using mixed address formats
  const info = await transport.sendMail({
    from: 'TungTung',
    to: email,
    subject: "Authentication Mail from MailDude",
    text: "Authenticate through your further actions.", // verification Code
    html: template,
  });
}

//Cleaning url for duplicated links
function normalizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    let cleanPath = parsed.pathname.toLowerCase();

    if (cleanPath.endsWith('/index.php') || cleanPath.endsWith('/index.html')) {
      cleanPath = cleanPath.replace(/\/index\.(php|html)$/, '/');
    }

    if (cleanPath.length > 1 && cleanPath.endsWith('/')) {
      cleanPath = cleanPath.slice(0, -1);
    }

    return `${parsed.origin}${cleanPath}${parsed.search}`;
  } catch (err) {
    return null;
  }
}







//Main Agent api 
app.post('/callagent',async (req,res)=>
{
  
const {umsg,uidentity,clToken} = req.body;

const host = req.headers.origin;
if(!clToken || !host || !uidentity)
{
  res.status(201).json({
    message:'Cltoken or host or identity string was remained incomplete',
    type:'error'
  });

  return;
}


//AGENT_UNAME_BLOCK========================================================
try{

  const fetUnameq = 'select name from tbl_users where cltoken = $1';
  const fetUnameqRes = await pool.query(fetUnameq,[clToken]);

if(fetUnameqRes.rowCount > 0)
  {

const tblUName = fetUnameqRes.rows[0].name.replace("@gmail", "")
        .replace("@hotmail", "")
        .replace("@service", "")
        .replace("@yahoo", "")
        .replace(".com", "")
        .replaceAll("_", "")
        .replaceAll(".", "")
        .replaceAll("@", "");

//AGENT=UNIQUE_HOST AND DEC_AI DEC_STORE BLOCK=============================

try{
const mainEncdecQ = `select botname,botdesc,host,aikey,storekey,orgname,context from ${tblUName} where host = $1`;
const mainEncdecQRes = await pool.query(mainEncdecQ,[host]);

if(mainEncdecQRes.rowCount > 0)
{
const st_host = mainEncdecQRes.rows[0].host;
//Structure calrification
if(st_host === host)
{
const dec_ai_key = cryptr.decrypt(mainEncdecQRes.rows[0].aikey);
const dec_store_key = cryptr.decrypt(mainEncdecQRes.rows[0].storekey);
const context = mainEncdecQRes.rows[0].context;
const botname = mainEncdecQRes.rows[0].botname;
const botdesc = mainEncdecQRes.rows[0].botdesc;
const orgname = mainEncdecQRes.rows[0].orgname;
const systemConf = {
  "bot_info": {
    "name": `${botname}`,
    "description": `${botdesc}`,
    "organization": `${orgname}`,
    "website_data": `${context}`
  },

  "system_instructions": [
    {
      "text": `You are an AI assistant named ${botname}, created by ${orgname} to help users with a variety of tasks and questions.`,
      "confidence": 1.0
    },
    {
      "text": `Your primary role is to ${botdesc}, providing helpful, accurate, and friendly assistance to users who interact with you.`,
      "confidence": 0.95
    },
     {
      "text": "When a user asks a question, first attempt to answer it using the provided context, which includes links to relevant pages.",
      "confidence": 1.0
    },
    {
      "text": "If the provided context does not contain enough information to comprehensively answer the user's question, navigate to the linked pages that are most relevant to the question.",
      "confidence": 0.95
    },
  ],

  "system_constraints": {
    "temperature": 0.7,
    "max_tokens": 150,
    "top_p": 1,
    "frequency_penalty": 0,
    "presence_penalty": 0
  },

  "response_guidelines": [
    {
      "text": "Provide clear, concise answers that directly address the user's question or request.",
      "confidence": 0.9
    },
    {
      "text": `Maintain a friendly, professional tone that reflects positively on ${orgname} and builds trust with users.`,
      "confidence": 0.95
    },
    {
      "text": "If a user's request is unclear or ambiguous, ask clarifying questions before attempting to provide a final answer.",
      "confidence": 0.85
    }
  ],

  "ethical_guidelines": [
    {
      "text": "Do not provide advice or opinions on sensitive topics like medical, legal, or financial issues. Instead, encourage users to consult relevant professionals.",
      "confidence": 1.0
    },
    {
      "text": "Avoid generating content that is hateful, offensive, or biased against any group. Strive to be inclusive and respectful of all users.",
      "confidence": 1.0
    }
  ]
};


 const ai = new GoogleGenAI(dec_ai_key);
//Simple format for params and returns
//function addTwoNums ({a,b})
//{
//  return { result: a + b };
//}

//Scrape url
async function web_search1({startUrl1,maxPages1 = 10}) {
//browser in bg invisible
let browser1;
try{
  browser1 = await puppeteer.launch({
    headless:true
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
try{
await page1.goto(currentUrl1,{waitUntil:'networkidle2',timeout:30000});

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

//console.log(await web_search1('https://www.omtechsoftware.com'))

//list of function for ai with actual name 
const functionMap = {
web_search1:web_search1
}

//tool schema for gemini
const tools = [
  {
    functionDeclarations: [
      {
        name: "web_search1",
        description: "Extracts content from a specific, fully-qualified web URL provided directly in the text. Do NOT use this for general internet queries or web searches without a direct link.",
        parameters: {
          type: Type.OBJECT,
          properties: {
           startUrl1: { type: Type.STRING, description: "The complete  HTTPS URL to scrape (e.g., https://example.com)" },
            maxPages1 : {type:Type.NUMBER , description : "Maximum pages to scrape. Default is 10."},
          },
          required: ["startUrl1"],
        },
      },
    ],
  },
];


 async function askGemini(prompt) {
  

  const REDIS_URL = dec_store_key;
  const redisClient = createClient({ url: REDIS_URL });

redisClient.on("error", (err) => console.error("Redis Error:", err));
  await redisClient.connect();

  const historyKey =`chat:history-${botname}:${uidentity}`;

try{
  //getting rawHistory from redis with its key
const rawHistory = await redisClient.get(historyKey);
    let history = rawHistory ? JSON.parse(rawHistory) : [];

    //push user messages into the histoy
    history.push({ role: "user", parts: [{ text: prompt }] });

//only prompt
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      config: {tools ,
         systemInstruction: [
JSON.stringify(systemConf)
      ],
      },
      contents: history,

    });

//Check if Gemini requested a function call
  const call = response.functionCalls?.[0];
  if(call)
  {
    const { name, args } = call;
    console.log(`Gemini called -> ${name} with parameters:`, args);
 

 //   if (typeof functionMap[name] !== "function") {
//  throw new Error(`Function "${name}" is not defined inside functionMap. Available keys: ${Object.keys(functionMap).join(", ")}`);
//}
 //Run the function locally
   const functionResult = await functionMap[name](args);
history.push({
    role: "user",
    parts: [{
      functionResponse: {
        name: name,
        response: functionResult,
      },
    }],
  });

const finalResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents:history,
    });

    history.push(finalResponse.candidates[0].content);
const fbotAnswer = finalResponse.text;

res.status(201).json({
  message:fbotAnswer,
  type:'bot',
  botname:botname,
})
  }
else{

const botAnswer = response.text;


res.status(201).json({
  message:botAnswer,
  type:'bot',
  botname:botname,
  botdesc:botdesc,
  
})

    // Append Gemini's output to history
history.push(response.candidates[0].content);

}

//save entire updated chat history
await redisClient.set(historyKey, JSON.stringify(history));


}

finally{
await redisClient.disconnect();
}
  

}


askGemini(umsg);




}

}

else{
  res.status(201).json({
    message:'Cannot Resonate with inavlid host',
    type:'error'
  })
}


}
catch(err)
{

  res.status(500).json({
    message:'An Error occured while resonating with host',
    type:'error',
   
  })

}
    
}

else{

  res.status(201).json({
    message:'I am expireincing failure with Authentication , I will be back soon! Sorry 😭',
    type:'error'
  })

}

}

catch(err)
{
  res.status(500).json({
    message:'I am expireincing failure with Authentication , I will be back soon! Sorry 😭',
    type:'error'
  })
}
//2.fetch select name from tbl_users where clToken = clToken
//3.got username secondstep from it ----> select host,context from ${userName} where host = uhost;
//4.where conditions matches again match it in if just for code structure
//5.now decrypt the aikey and storage key
//6.after sucessfully getting it just call the ai


})


//Template-construction-endpoint=========


app.post('/constructtmp',async(req,res)=>
{

const {clToken} = req.body;
const host = req.headers.origin;

if(!clToken || !host)
{
  res.status(201).json({
    message:'Cltoken or host was remained incomplete',
    type:'error'
  })

  return;
}

try{

const getUuidQuery = `select uuid,name from tbl_users where cltoken = $1`;

const getUuidQueryRes = await pool.query(getUuidQuery,[clToken]);

console.log(getUuidQueryRes);

if(getUuidQueryRes.rowCount > 0)
{
  const uuidTmp = getUuidQueryRes.rows[0].uuid;
const uNameTmp = getUuidQueryRes.rows[0].name.replace("@gmail", "")
        .replace("@hotmail", "")
        .replace("@service", "")
        .replace("@yahoo", "")
        .replace(".com", "")
        .replaceAll("_", "")
        .replaceAll(".", "")
        .replaceAll("@", "");



  try{
const getProjectInfo = `select b.botname , b.botdesc,t.tmp_style from ${uNameTmp} b inner join tbl_templates t on t.host = b.host and t.uuid = b.uuid where b.host = $1 and b.uuid = $2  
`;

  const getProjectInfoRes = await pool.query(getProjectInfo,[host,uuidTmp]);



  if(getProjectInfoRes.rowCount > 0)
  {
res.status(201).json({
data:{
botname:getProjectInfoRes.rows[0].botname,
botdesc:getProjectInfoRes.rows[0].botdesc,
templateStyle:getProjectInfoRes.rows[0].tmp_style
},
type:'success'
});
  }
  else{
res.status(201).json({
  message:'Error authenticating template',
  type:'error'
  
})
  }

}
catch(err)
{
  res.status(500).json({
    message:'encountered an error while authenticating',
    type:'error'
  })
}

  
}
else{
res.status(201).json({
  message:'Error authenticating template',
  type:'error'
})
}


}

catch(err)
{
  
  res.status(500).json({
    message:'I am expireincing failure with Authentication , I will be back soon! Sorry 😭',
    type:'error',
    //error:err

  })
}

});


//Setup context
app.get('/setupContext',async (req,res) =>
{


  const {url,uuid,botname} = req.query;
const cleanUrl = normalizeUrl(url);
//site crawwl 
async function CrawlSite(startUrl,maxPages) {
//browser in bg invisible
let browser;
try{
  browser = await puppeteer.launch({
    headless:true
  });

  const queue = [startUrl];
  //unique links and to avoid re visit of the same links again 
  const visitedLinks = new Set();
const siteData = [];

//Origin without any / slashes or other page go to main page
const baseOrigin = new URL(startUrl).origin;

//Loop till no oen is in que and untile it has not reach limit of maxpage
while(queue.length > 0 && visitedLinks.size < maxPages)
{
  const currentUrl = queue.shift();

//skip link if already visite real use of visitedLinks
if(visitedLinks.has(currentUrl)) continue;

//Makr current url as visited once its done
visitedLinks.add(currentUrl);

const page = await browser.newPage();
try{
await page.goto(currentUrl,{waitUntil:'networkidle2',timeout:30000});

const title = await page.title();

const text = await page.evaluate(()=>document.body.innerText.trim());

//Link extractions

const internalLinks = await page.evaluate((origin)=>
{
return Array.from(document.querySelectorAll('a[href]'))
.map(a => a.href)
.filter(href => href.startsWith(origin))
.map(href=> href.split('#')[0]);

},baseOrigin);

siteData.push({
  url:currentUrl,
  title:title,
  text:text,
  content:text.length,
  discoverLinks:internalLinks,
  pages:internalLinks.length,
})

for(const link of internalLinks)
{
  if(!visitedLinks.has(link) && !queue.includes(link))
  {
    queue.push(link)
  }
}


}

catch(err)
{
res.status(500).json({
  message:'Error occured while reading your site',
  type:'error'
})
}
finally{
  //close individual tab to preserve ram
  await page.close()
}






//DB_AREA_AFTER_SCRAPE=========================================
try{
const uNamequery = 'select name from tbl_users where uuid = $1';
const uNamequeryRes = await pool.query(uNamequery,[uuid]);

if(uNamequeryRes.rowCount > 0)
{
const tbName = uNamequeryRes.rows[0].name.replace("@gmail", "")
        .replace("@hotmail", "")
        .replace("@service", "")
        .replace("@yahoo", "")
        .replace(".com", "")
        .replaceAll("_", "")
        .replaceAll(".", "")
        .replaceAll("@", "");

       
//==================CONTEXT+STOREMAINBLOCK=================
        try{
const processed_site_data = JSON.stringify({
  url:siteData[0].url,
  title:siteData[0].title,
  Page_text:siteData[0].text,
  internal_Links:siteData[0].discoverLinks,
});


          const updtContextQuery = `update "${tbName}" set context = $1 where botname = $2`;
          const updtContextQueryRes = await pool.query(updtContextQuery,[processed_site_data,botname]);

          if(updtContextQueryRes.rowCount > 0)
          {

            res.status(201).json({
  message:`Successfully read your site and Saved Info 👍 Title:- ${siteData[0].title} , 👍 Content length:- ${siteData[0].content.length} 👍 Total pages :- ${siteData[0].pages.length}`,
  type:'success',
  
});

          }
else{
  res.status(201).json({
    message:'There was an problem saving your context',
    type:'error'

  })
}


        }

        catch(err)
        {
res.status(500).json({
message:'Error occured saving your context',
type:'error',
//eror:err
})
        }


}
else{
res.status(201).json({
  message:'Invalid or expired session',
  type:'error'
})
}


}
catch(err)
{
res.status(500).json({
  message:'Error occured in database',
  type:'error',
  
})
}
//============================================================


}

}
catch(err)
{
res.status(500).json({
  message:err.message,
  type:'error'
})
}


}

  CrawlSite(cleanUrl,20);

})


//setup Project
app.get('/setupProject', async (req, res) => {
  const { uuid, storeKey, aiKey, host, botName, botDesc, OrgName } = req.query;

const enc_storeKey = cryptr.encrypt(storeKey.toString());
const enc_aiKey = cryptr.encrypt(aiKey.toString());

//if(uuid === "" || storeKey === "" || aiKey === "" || host ==="" || botName === "" || botDesc === "" || OrgName === "")
//{

//res.status(201).json({
//message:'Necessary feilds were found incomplete',
//type:'error'

//});

//}

  try {




    const fetchuserName = 'SELECT name FROM tbl_users WHERE uuid = $1';
    
    // Fixed: pool.query instead of invalid pool.await
    const fetchuserNameRes = await pool.query(fetchuserName, [uuid]);

    if (fetchuserNameRes.rows.length > 0) {
      
      const rawName = fetchuserNameRes.rows[0].name;
      const userName = rawName
        .replace("@gmail", "")
        .replace("@hotmail", "")
        .replace("@service", "")
        .replace("@yahoo", "")
        .replace(".com", "")
        .replaceAll("_", "")
        .replaceAll(".", "")
        .replaceAll("@", "");


//Next step setup the project tbl

try{
  const setupQuery = `create table ${userName}(
  id BIGSERIAL primary key,
  uuid varchar(250) null,
  aiKey text null,
  storeKey text null,
  botName varchar(250) null,
  botDesc varchar(250) null,
  orgName varchar(250) null,
  host varchar(250) null,
  context text null
)`

 const setupQueryRes = await pool.query(setupQuery);


if(setupQueryRes.command === 'CREATE')
 {

//Insert After Sucessfull table creation with username
try{
 //console.log(userName)
const insertProjectquery = `insert into "${userName}" (uuid,aikey,storekey,botname,botdesc,orgname,host) values($1,$2,$3,$4,$5,$6,$7)`;
const insertProjectqueryRes = await pool.query(insertProjectquery,[uuid,enc_aiKey,enc_storeKey,botName,botDesc,OrgName,host]);

if(insertProjectqueryRes.rowCount === 1)
{
res.status(201).json({
message:'sucessfull project setup',
type:'success'

})
}
else{

res.status(201).json({
 message:'error setting up your project',
 type:'error' 
})

}

}
catch(err)
{
  res.status(500).json({
    message:'error occured in database',
    type:'error',
   //error:err
    
  })
}

}


 else{
  res.status(201).json({
    message:'Error setting up project',
    type:'error'
  })
 }

}

catch(err)
{

if(err.code === '42P07')
{


try{
const botCheckQuery = `select exists (select botname from ${userName} where botname = $1)`;
const botCheckQueryRes = await pool.query(botCheckQuery,[botName]);

if(botCheckQueryRes.rows[0].exists)
{
  res.status(201).json({
    message:'There cannot be two bot existing with same name',
    type:'error'
  })
}

else{

try{

const insertProjectquery1 = `insert into "${userName}" (uuid, aikey, storekey, botname, botdesc, orgname, host) 
  values ($1, $2, $3, $4, $5, $6, $7)`;
const insertProjectqueryRes1 = await pool.query(insertProjectquery1,[uuid,enc_aiKey,enc_storeKey,botName,botDesc,OrgName,host]);


if(insertProjectqueryRes1.rowCount === 1)
{
res.status(201).json({
message:'sucessfull project setup',
type:'success'

})
}
else{

res.status(201).json({
 message:'error setting up your project',
 type:'error' 
})

}

}
catch(err)
{
  //rn im getting this one
  res.status(500).json({
    message:'error occured in database', 
 //error:err,
    type:'error'
  })


}



}


}

catch(err)
{
  res.status(500).json({
    message:'error occured in database',
     //error:err,
    type:'error'
  })
}


}


//da real error
else{

  res.status(500).json({
  message:'Error in database occured',
//  error:err,
  type:'error'
})


}



}

      
      
      } else {
      res.status(201).json({
        message: 'cant find user or invalid session',
        type: 'error'
      });
    }
  } catch (err) {
   // console.error('Error setting up project:', err);
    res.status(500).json({
      message: 'Internal server error',
      type: 'error'
    });
  }
});




app.listen(4000, () => {
  console.log('App running on port 4000');
});