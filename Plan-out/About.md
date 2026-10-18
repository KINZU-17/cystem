# PROJECT CYSTEM -> APPLICATION
- This is an application that is mostly uses react, javascript, python, tailwindcss as main tools & languages. This will make the idea in the scram-idea folder to change into this specific languages.
- It is a hide and seek application (but like a bit of the snapchat application)
- You get to play with friend/users, you get to take pictures of the places you are at and videos giving a small hint to the seekers. To play your location,camera and other permissions should be on..
- In this Game lets put it that the seeker finds you and earns points - money, which the hider had in his/her account as reward.
- This is deposited into the account first in the registration inclusive of the Email, Phone, Username etc.
- The hider after deposit and records/post from app only their will be a certain duration given with the hider were we get to make the one hiding also earn. If not found during the certain duration the seekers who accepted get to lose from their points and given to the hiding according to what they placed.
- Earn from what people agreed according to the people tapped to seek for /hide from. Add oods in order for the for the hiding & seekers.
- *Where to hide:* it should be a public place in order for it to be easy for the seeker. Recordings will be done from the app only.
- *How to win:* Will be using the first come first serve rule in order to settle winner.
- Winner gets points which can be later be withdrawn into real money use USD & KSH

* 1 point will be 130ksh but when withdrawn from the application ADMIN get a tiny share of 3 shillings to his account.

## Key FEATURES:
1. maps 
2. camera
3. location
4. stk push for now
5. 

- Lets have a welcome to CYSTEM which shows how the application works.

- Confirmation messege to email of welcome, deposits and withdrawals of money

*admin gets to see the number of users and all*




### Because of being global it should have:
1. Load Balancer
2. Multiple servers
3. Cache
4. Queue
5. CDN
6. Replica -> Database 
7. Shard 
8. CI/CD 
9. OSI model for photos



### Perform a comprehensive security audit and hardening on this codebase across the following areas:

1. Password Hashing & Authentication: Verify if passwords are being hashed before storage[span_0](start_span)[span_0](end_span). If custom auth is used, ensure bcrypt (or equivalent secure hashing) is implemented prior to saving any password[span_1](start_span)[span_1](end_span). If Supabase Auth is used, verify it is configured correctly[span_2](start_span)[span_2](end_span).
2. Password Validation Rules: Enforce strict password validation rules prior to user sign-up (minimum 8 characters, at least one number, and at least one special character)[span_3](start_span)[span_3](end_span).
3. Breach Detection Integration: Integrate the HaveIBeenPwned API during user sign-up to check and block passwords exposed in known data breaches[span_4](start_span)[span_4](end_span).
4. Environment Variables & Credentials: Search the entire codebase for hardcoded database connection strings, credentials, API keys, or secrets[span_5](start_span)[span_5](end_span). Move all sensitive variables exclusively into `.env` files[span_6](start_span)[span_6](end_span).
5. Logging & Console Output: Audit all `console.log` statements and logging mechanisms[span_7](start_span)[span_7](end_span). Remove any logs that expose form data, request bodies, passwords, or sensitive user inputs[span_8](start_span)[span_8](end_span).
6. Error Handling & Leak Prevention: Review every error handler in this project[span_9](start_span)[span_9](end_span). Ensure no raw error messages, stack traces, or internal file paths reach the user in production[span_10](start_span)[span_10](end_span). Replace them with clean, human-readable responses, and highlight any area where sensitive error details could be exposed[span_11](start_span)[span_11](end_span).
7. Dependency Security & Auditing: Scan all dependencies for known vulnerabilities, outdated packages, unmaintained libraries, or unused dependencies[span_12](start_span)[span_12](end_span). Provide exact commands to update, replace, or safely remove them[span_13](start_span)[span_13](end_span).
