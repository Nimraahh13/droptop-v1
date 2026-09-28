DROP & TOP PIZZA - WEBSITE (Supabase version)
=============================================
No PHP or MySQL needed. Plain HTML + CSS + JavaScript, with Supabase as the database.

SETUP (one time, about 10 minutes)
1. Open your Supabase project > SQL Editor > New query.
   Paste everything from supabase-setup.sql and click Run.
   (This creates the tables, security rules and the full menu.)
2. Supabase > Project Settings > API. Copy the "Project URL" and the "anon public" key.
   Open js/supabase-config.js and paste them in. NEVER use the service_role key.
3. Create the owner login:
   Supabase > Authentication > Users > Add user > enter your email + strong password
   (tick "Auto confirm user"). Then in SQL Editor run (with your email):
   insert into admins (user_id) select id from auth.users where email = 'you@example.com';
4. Supabase > Authentication > Sign In / Providers: turn OFF "Allow new users to sign up"
   (only you should have an account).

TRY IT ON YOUR COMPUTER
Open the folder in VS Code, install the "Live Server" extension, right-click index.html > Open with Live Server.

PUT IT ONLINE (free options)
Upload the whole folder to Netlify (drag & drop at app.netlify.com/drop), Vercel, GitHub Pages or any normal hosting.
Customer site:  https://yourdomain.com/
Owner panel:    https://yourdomain.com/admin/login.html   (not linked anywhere on the customer site)

PAGES
index.html, menu.html, cart.html, checkout.html, order-success.html, contact.html
admin/login.html, admin/index.html (orders + new order alert, refreshes every 30s),
admin/order.html (full order + print), admin/menu.html (edit prices, hide/show, add items)

SECURITY
- Prices are always taken from the database when an order is placed, never from the browser.
- Customers can only place orders; they cannot read or change any orders.
- Only accounts listed in the admins table can see orders or edit the menu.

==================================================
ORDER NOTIFICATIONS (email + WhatsApp + browser alert)
==================================================
Email and WhatsApp are sent by Supabase's servers, so they arrive even
when the owner panel is closed. The browser alert works while the owner
panel is open in a tab (phone or computer).

A) GET A FREE EMAIL KEY (Resend)
   1. Sign up at https://resend.com with the OWNER's email.
   2. API Keys > Create API Key > copy it (starts with re_).
   Note: on the free plan without your own domain, Resend only emails the
   address you signed up with - that is fine for owner alerts.

B) GET A FREE WHATSAPP KEY (CallMeBot)
   1. Save the number +34 644 51 95 23 in the owner's phone contacts.
   2. From the owner's WhatsApp, send it:  I allow callmebot to send me messages
   3. It replies with your apikey. (If the number has changed, check
      https://www.callmebot.com/blog/free-api-whatsapp-messages/ )

C) CREATE THE FUNCTION IN SUPABASE
   1. Supabase > Edge Functions > Deploy a new function > Via Editor.
   2. Name it exactly:  notify-order
   3. Delete the sample code, paste ALL of edge-function/notify-order/index.ts, Deploy.
   4. In the function's Details/Settings, turn OFF "Verify JWT" (Enforce JWT) and save.
      (The function checks its own password instead.)

D) ADD THE SECRETS
   Supabase > Edge Functions > Secrets > add:
     WEBHOOK_SECRET    = any long random password you make up (30+ letters/numbers)
     RESEND_API_KEY    = re_...
     OWNER_EMAIL       = owner's email (same one used for Resend)
     CALLMEBOT_PHONE   = 923003132136   (country code, no + or spaces)
     CALLMEBOT_APIKEY  = the key from CallMeBot
   These stay on Supabase only. NEVER put them in any website file.

E) CONNECT ORDERS TO THE FUNCTION
   1. Open notifications-setup.sql, replace YOUR-PROJECT and YOUR-WEBHOOK-SECRET.
   2. Paste it into Supabase > SQL Editor > Run.

F) TURN ON THE BROWSER ALERT
   Log in to the owner panel and tap "Turn on order alerts", then Allow.
   Keep that tab open; each new order beeps and shows a pop-up.

TEST: place an order on the website. Within a few seconds you should get
the email, the WhatsApp message and the browser alert. If one is missing,
check Supabase > Edge Functions > notify-order > Logs - it says
"sent", "failed" or "skipped" for each.
