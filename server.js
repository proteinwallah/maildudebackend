console.log('BUILD CHECK 123');
require('dotenv').config();
const express = require('express');
const app = express();
const {Pool} = require('pg');
const bcrypt = require('bcryptjs');//pwd hashing
const Cryptr = require('cryptr');//Encryption of one time pwds
const cryptr = new Cryptr(process.env.ENC_KEY);
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cors = require('cors');
const rateLimit = require('express-rate-limit');


const saltRounds = 12;

//Json use
app.use(express.json());
//Secure
app.use(cors()); 
//Database Connection
const pool = new Pool({
    connectionString:process.env.SUPABASEPOSTGRE,
    ssl:{
        rejectUnauthorized:false
    },
    max:10,
});


const rateLimiter = rateLimit({
 windowMs: 15 * 60 * 1000,   // 15 minutes
  limit: 7,                   // 7 requests per IP per window (v8 name)
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  ipv6Subnet: 56,
  handler: (req, res) => {
    res.status(429).json({
      
      message: 'Too many requests. Please try again after 15 minutes.',
      type:'error'
    });
  },
});


//Node mailer email sending
async function sendEmail(email,template) {
  // Create a transport with your SMTP server settings
  const transport = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure:false, //true for port 485
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
    text: "Authenticate through your further actions.", //verification Code
    html: template, 
  });
}


//Register------------------------------------------------------------- 
app.post('/register',rateLimiter,async (req,res)=>
{
const {email,pwd}=req.body;
const uuid = crypto.randomBytes(2).toString('hex');
const cl_token = crypto.randomBytes(5).toString('hex'); 
try{
const emailCheck = 'select exists (select name from tbl_users where name = $1)';
const emailRes = await pool.query(emailCheck,[email]);

const emailExists = emailRes.rows[0].exists;

if(emailExists)
{
res.status(201).json({
    message:'Account already exists maybe try login',
    type:'error'
})
}

else{
let otp = Math.floor(1000 +Math.random() * 9000);
let otp_enc = cryptr.encrypt(otp.toString());

bcrypt.hash(pwd,saltRounds,async function(err,hash)
{

try{
const query = 'insert into tbl_users (name,pwd_enc,otp,uuid,cltoken) values($1,$2,$3,$4,$5)';
const result = await pool.query(query,[email,hash,otp_enc,uuid,cl_token]);
let template = `
     <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;width:100%;background:#ffffff;border:1px solid #d4d4d4;">
          <tr>
            <td style="padding:40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:14px;font-weight:600;color:#1a1a1a;padding-bottom:32px;">
                    TungTung
                  </td>
                </tr>
                <tr>
                  <td style="font-size:20px;font-weight:600;color:#1a1a1a;padding-bottom:12px;">
                    Your sign-in code
                  </td>
                </tr>
                <tr>
                  <td style="font-size:15px;color:#737373;padding-bottom:32px;line-height:1.5;">
                    Enter this code to finish signing in. It was requested from ${email}.
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background:#fafafa;border:1px solid #e5e5e5;padding:24px;text-align:center;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                            <tr>
                              <td style="font-family:ui-monospace,SFMono-Regular,monospace;font-size:32px;font-weight:600;letter-spacing:6px;color:#1a1a1a;">
                             ${otp}
                              </td>
                            </tr>
                       
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#525252;border-top:1px solid #e5e5e5;padding-top:20px;">
                    If you didn't request this code, you can safely ignore this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
res.status(201).json({
    message:'user created sucessfully!',
    type:'success',
    token:uuid,
})

//Send an Otp to user email after an entry
sendEmail(email,template); 



}
catch(err)
{
res.status(500).json({message:err.message,
type:'error'
})
}





})


}


}

catch(err)
{
  res.status(500).json({error:err.message})  
}


});
//-----------------------------------------------------

//Otp verification--------------------------------------------------------
app.post('/otpver',async (req,res)=>
{
const {uotp,uuid} = req.body;

//get the otp from db first 
try{

const otpQuery = 'select otp from tbl_users where uuid = $1';
const otpResult = await pool.query(otpQuery,[uuid]);
const stored_otp = otpResult.rows[0].otp;

if(parseInt(uotp) == parseInt(cryptr.decrypt(stored_otp)))
{


try{
const verFlag = 'update tbl_users set is_ver = 1 where uuid = $1';
const verResult = await pool.query(verFlag,[uuid]);
//const verStatus = verResult.rows[0];

res.status(201).json({
   message:'verification sucessfull',
   type:'success'
  })


}
catch(err)
{
    res.status(500).json({
        message:err.message,
        type:'error'
    })
    

}


  

}

else{

res.status(201).json({
  message:'invalid or expired code entered',
  type:'error'
})

}

}

catch(err)
{
    res.status(500).json({
        message:err.message,
        type:'error'
    })
}


})

//Resend otp -------------------------------------------------------------
app.post('/resend',rateLimiter,async(req,res)=>
{
  const {uuid} = req.body;
let otp = Math.floor(1000 +Math.random() * 9000);
let otp_enc = cryptr.encrypt(otp.toString());


try{
const rotpQuery = 'update tbl_users set otp=$1 where uuid ="$2" returning name';
const rotpResult = await pool.query(rotpQuery,[otp_enc,uuid]);


if(rotpResult.rowCount > 0)
{

const ruemail  = rotpResult.rows[0].name;
//Send email ofc a success

sendEmail(ruemail,`<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="0" style="max-width:520px;width:100%;background:#ffffff;border:1px solid #d4d4d4;">
          <tr>
            <td style="padding:40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="font-size:14px;font-weight:600;color:#1a1a1a;padding-bottom:32px;">
                    TungTung
                  </td>
                </tr>
                <tr>
                  <td style="font-size:20px;font-weight:600;color:#1a1a1a;padding-bottom:12px;">
                    Your sign-in code
                  </td>
                </tr>
                <tr>
                  <td style="font-size:15px;color:#737373;padding-bottom:32px;line-height:1.5;">
                    Enter this code to finish signing in. It was requested from ${ruemail}.
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:24px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="background:#fafafa;border:1px solid #e5e5e5;padding:24px;text-align:center;">
                          <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                            <tr>
                              <td style="font-family:ui-monospace,SFMono-Regular,monospace;font-size:32px;font-weight:600;letter-spacing:6px;color:#1a1a1a;">
                             ${otp}
                              </td>
                            </tr>
                       
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:13px;color:#525252;border-top:1px solid #e5e5e5;padding-top:20px;">
                    If you didn't request this code, you can safely ignore this email.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`)

res.status(201).json({
  message:'Succesfully sent you a otp',
  type:'success'
})
}
else{
  res.status(201).json({
    message:'Could not resend otp',
    type:'error',
  })
}

}

catch(err)
{
  res.status(500).json({
    message:err,
    type:'error',
  })
  
}

});
//-------------------------------------------------------------------------

//Login----------------------------------------------------------------
app.post('/login',async(req,res)=>
{
const {uemail,upwd} = req.body;

try{
const userExist = 'select name,pwd_enc,is_ver,uuid from tbl_users where name=$1';
const userExistRes =await pool.query(userExist,[uemail]);
//=======================check user email exist or not
if(userExistRes.rows.length > 0){
//const userEmail =userExistRes.rows[0].name;
const userEncpwd = userExistRes.rows[0].pwd_enc; //hashed Pwd
const isVer = userExistRes.rows[0].is_ver;//verification flag

bcrypt.compare(upwd,userEncpwd,function(err,result){

if(result == true && isVer == 1)
{

res.status(201).json({
  message:'Login sucessfull',
  token:userExistRes.rows[0].uuid,
  type:'success'
});

}
else if(result == true && isVer == 0)
{
  res.status(201).json({
  message:'Login sucessfull',
   token:userExistRes.rows[0].uuid,
  reotp:true,
  type:'success'
});
}


else{
res.status(201).json({
  message:'Invalid login credentials or invalid password',
  type:'error'
});
}

})

}

else{
res.status(201).json({
    message:'User with this email does not exist try sign up',
    type:'error'
  })
}


}
catch(err)
{
  res.status(500).json({
    message:err.message,
    type:'error'
  })
}



})
//---------------------------------------------------------------------

//Forgot Password-----------------------------------------------------
app.post('/fpwd',rateLimiter,async(req,res)=>
{
const {uemail} = req.body;
//Plain
const u_token = crypto.randomBytes(6).toString('hex');
//Add An hour to the same date in milisseconds
const link_exp = Date.now() + 60 * 60 * 1000;
const reset_link = `https://maildude.vercel.app:3000?token=${u_token}&fpwd=true`;
const u_tk_hash = crypto.createHash('sha256').update(u_token).digest('hex');

try{

const updtFpwd = `update tbl_users set link_exp=$1,token=$2 where name=$3`;
const updtFpwdRes = await pool.query(updtFpwd,[link_exp.toString(),u_tk_hash,uemail]);
const resetPwdtemplate = ` <!-- Preheader (hidden preview text) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">
    Use the link below to reset your password. It expires in 30 minutes.
  </div>
 
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
 
        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; background-color:#ffffff; border-radius:12px; border:1px solid #e5e7eb;">
 
          <!-- Logo / Brand -->
          <tr>
            <td align="center" style="padding:40px 40px 8px 40px; font-family:Arial, Helvetica, sans-serif;">
              <span style="font-size:20px; font-weight:bold; color:#111827; letter-spacing:-0.3px;">TungTung</span>
            </td>
          </tr>
 
          <!-- Heading -->
          <tr>
            <td align="center" style="padding:24px 40px 0 40px; font-family:Arial, Helvetica, sans-serif;">
              <h1 style="margin:0; font-size:22px; line-height:30px; font-weight:bold; color:#111827;">
                Reset your password
              </h1>
            </td>
          </tr>
 
          <!-- Body copy -->
          <tr>
            <td align="center" style="padding:16px 40px 0 40px; font-family:Arial, Helvetica, sans-serif;">
              <p style="margin:0; font-size:15px; line-height:24px; color:#4b5563;">
                Hi ${uemail},<br><br>
                We received a request to reset the password for your account. Click the button below to choose a new one.
              </p>
            </td>
          </tr>
 
          <!-- Button -->
          <tr>
            <td align="center" style="padding:32px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:8px; background-color:#111827;">
                    <a href="${reset_link}" target="_blank"
                       style="display:inline-block; padding:14px 36px; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:bold; color:#ffffff; text-decoration:none; border-radius:8px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
 
          <!-- Expiry note -->
          <tr>
            <td align="center" style="padding:0 40px; font-family:Arial, Helvetica, sans-serif;">
              <p style="margin:0; font-size:13px; line-height:20px; color:#6b7280;">
                This link expires in <strong style="color:#374151;">60 minutes</strong>.
                If you didn't request this, you can safely ignore this email — your password won't change.
              </p>
            </td>
          </tr>
 
          <!-- Divider -->
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td style="border-top:1px solid #e5e7eb; font-size:0; line-height:0;">&nbsp;</td></tr>
              </table>
            </td>
          </tr>
 
     
 
        </table>
        <!-- /Card -->
 
        <!-- Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding:24px 20px; font-family:Arial, Helvetica, sans-serif;">
              <p style="margin:0; font-size:12px; line-height:18px; color:#9ca3af;">
               <br>
                You received this email because a password reset was requested for your account.
              </p>
            </td>
          </tr>
        </table>
 <tr>
Physical link [TestMode]:${reset_link}

 </tr>
      </td>
    </tr>
  </table>`
if(updtFpwdRes.rowCount > 0)
{

  sendEmail(uemail,resetPwdtemplate);

  res.status(201).json({
    message:'Reset link Sent',
    type:'success'
  });

}


}
catch(err)
{
  res.status(500).json({
    message:err,
    type:'error'
  })
}








})
//-------------------------------------------------------------------

//Reset Password-----------------------------------------------------

app.post('/vfpwd',async(req,res)=>
{
  const {token,npwd} = req.body;
const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  
  try{


    const ResetPwd = 'select link_exp,token from tbl_users where token = $1';
const ResResestPwd = await pool.query(ResetPwd,[hashedToken]);
if(ResResestPwd.rowCount > 0)
{

let link_expirey = ResResestPwd.rows[0].link_exp;
let h_token = ResResestPwd.rows[0].token;


if(parseInt(link_expirey) > Date.now())
{
  bcrypt.hash(npwd,saltRounds,async function(err,nhpwd){

  try{

const updtPwd = 'update tbl_users set pwd_enc = $1 where token = $2';
const updtPwdRes = await pool.query(updtPwd,[nhpwd,hashedToken]);

if(updtPwdRes.rowCount > 0)
{

res.status(201).json({
    message:'sucessfully updated your password',
    type:'success'
  })


}

else{
res.status(201).json({
    message:'There was an issue updating your password',
    type:'error'
  })

}


  }

  catch(err)
  {
    res.status(500).json({
      message:err,
      type:'error'
    })
  }

  })
}

else{

res.status(201).json({
    message:'link expired or invalid token',
    type:'error'
  })

}

}

else{
  res.status(201).json({
    message:'invalid link or token expired',
    type:'error'
  })
}



  }

  catch(err)
  {
res.status(500).json({
  message:err,
  type:'error'
})
  }



})

//-------------------------------------------------------------------

app.listen(4000,()=>
{
    console.log('App runing on port 4000');
})