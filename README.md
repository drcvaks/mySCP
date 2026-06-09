I want to design and build a secure cross-platform app called mySCP for a Semichas Chaver Program-style learning community. The app should work on iOS, Android, and web.
The purpose of the app is to bring the SCP learning experience into one organized platform: local chaburah communication, source sheets, recordings, announcements, review questions, bechina prep, location directory, Rabbi/admin tools, and a global SCP dashboard.
The app should feel like:
WhatsApp + Source Sheet Library + Learning Dashboard + Bechina Review + Local Chaburah Hub
It should not replace in-person learning. It should strengthen local chaburos and make the learning easier to follow, review, and stay connected to.
Preferred Stack
Use:
•	React Native with Expo
•	Expo Router
•	TypeScript
•	Supabase for auth, database, storage, and row-level security
•	Supabase Storage for source sheets and recordings
•	Vercel or similar for web deployment later
Current Zman / Semester
Title:
Practical Kashrus: Kitchen, Food & Wine
Sections:
1.	Nat Bar Nat & Kitchen Kashrus
Weeks 1–6
2.	Stam Yeinam & Wine
Week 7+
User Roles
Create role-based permissions:
1.	Participant
o	View assigned chaburah
o	View announcements
o	View source sheets
o	View recordings
o	Take review quizzes
o	Submit questions to Ask the Rav
o	View personal progress
2.	Local Rabbi
o	Everything participant can do
o	Post announcements to his chaburah
o	Upload source sheets
o	Attach recordings or links
o	Schedule shiur reminders
o	Add or select review questions
o	Answer Ask the Rav questions
o	Access a private Rabbi-only communication tab
3.	Local Admin
o	Help manage local chaburah
o	Manage members
o	Post local announcements
o	Upload files
o	Assist with schedules and reminders
4.	Global Admin
o	Manage all users, roles, chaburos, files, questions, and official announcements
o	Approve Rabbis/admins
o	Post global SCP resources
o	Manage official review material and bechina resources
Important:
•	Admin tab should only appear for admins.
•	Rabbi tab should only appear for Rabbis/global admin
•	Regular users should see instead Settings where they can update their information.  E-mail cannot be changed in settings.
•	Users should only see what applies to them.
For fake data only, create a sample user:

Chaim Vaks
Role: Global Admin
Chaburah: Ohel Moshe
Registration
Registration should include:
•	Name
•	Email
•	Phone (optional)
•	Country
•	City
•	Role request: participant by default; Rabbi/Local Admin (requires approval)
After registration, show a popup or button on the My Chaburah page:
Join a Chaburah
Default the search to the city/country they entered during registration.
Initial Test Chaburos
Create these four Baltimore test chaburos:
Ohel Moshe
Address: 2808 Smith Avenue, Baltimore, MD 21209
Rabbi: Rav Shmuel Kimche
Schedule: Sunday 9:15 AM
Shomrei Emunah
Address: 6221 Greenspring Ave, Baltimore, MD 21209
Rabbi: Rav Binyamin Marwick
Schedule: Wednesday 8:00 PM
Suburban Orthodox Congregation Toras Chaim
Address: 7504 Seven Mile Lane, Baltimore, MD 21208
Rabbi: Rav Shmuel Silber
Schedule: Monday 8:00 PM
Vaks Test Chaburah

Address:  Wonderful Place, Baltimore, MD 21208
Rabbi:  Rav Chaim Vaks
Schedule: Sunday 8:00 PM
Each chaburah in the directory should have a button:
Join this Chaburah
Main Navigation
Use these main tabs:
1.	Dashboard
2.	My Chaburah
3.	Files
4.	Review
5.	Directory
6.	Rabbi Hub — only for Rabbis (local admins should not have access to this)
7.	Admin — only for Rabbis, local or global admins
8.	Global Admin – only for global admins (to approve requests and such)
9.	Profile — regular users
“Rooms” should not be called Rooms. Use My Chaburah because it feels more personal.
Dashboard Design
Make the dashboard attractive, modern, and motivating.
Suggested dashboard layout:
This Week in SCP
Current Topic: Practical Kashrus: Kitchen, Food & Wine
Next Shiur:
Sunday 9:15 AM
Latest Source Sheet
[Open]
Missed Last Shiur?
[Catch Up]
Bechina Readiness
78%
Review Questions
[Start Review]
Ask the Rav
[Submit Question]
Also include:
•	Current week
•	Recent announcements
•	Quick access to local chaburah
•	Progress card
•	Upcoming bechina info
My Chaburah Page
This page should show only what applies to that user’s selected chaburah.
Include:
•	Chaburah name
•	Rabbi
•	Schedule
•	Address
•	Announcements
•	Source sheets
•	Recordings
•	Reminders
•	Review questions assigned to that chaburah
•	Ask the Rav button
•	Join/change chaburah option
Local chaburah can be configured as:
•	Announcement-only
•	Moderated discussion from all participants in that chaburah
Create ability to chat, similar to WhatsApp, with a similar feel.  If Rabbi or Local Admin allows discussion then anyone in that chaburah can post questions or comments.  Otherwise it will only be for announcements from Rabbi or Local Admin.  Rabbi and Local Admin can change settings and post from the “Admin” tab.
By default the chaburah should only be announcement-ony until it is turned on to allow discussions by users within that chaburah.
By default anyone can join any chaburah, unless Rabbi/Admin requires permission.
Files Section
Use a Files tab.
Files should include:
•	Source sheets
•	Review sheets
•	Shiur recordings
•	PDFs
•	Links
Each file should have:
•	Title
•	Week
•	Topic
•	Local Chaburah or Everyone
•	Uploaded by
•	File type
Source sheets used during shiur should be stored here.
Review summaries can appear in Files and Review, but quizzes belong only in Review.
One can search by title, topic, or Type (Source sheet/Review Summary sheet).  Allow filter by “Everyone” or ”My Chaburah”
Review Section
The Review section should be organized by week.
Show a top week selector:
Week 1 | Week 2 | Week 3 | Week 4 | Week 5 | Week 6 | Week 7
Each week should have:
•	Review cards/questions
•	One question at a time
•	Multiple choice answers or True/False
•	Immediate feedback
•	Explanation after answer
•	Score percentage
•	Ability to retry for a better score
•	Progress shown per week
Example:
Week 3: 80% complete
Best score: 92%
Only Rabbi/Admin can add questions.
For test, import the provided JSON or CSV question bank created from the seven review sheets.
Prefer JSON if easier for Supabase seeding.

Directory page
Find SCP locations and chaburahs across the country.
Have a list of all the Chaburas with their information.  It should include the name of the chaburah, address, Rav and time of Shiur.  It can also say how many members are in it.  Also, put a button for each chaburah “Join Chaburah” if it’s not his Chaburah and “Joined” if it is his chaburah.
One can search by name, city or Rabbi.
Eventually we can add a picture of the Rabbi.  You can put blank for it for now.

Rabbi Hub
Create a separate Rabbi-only area where rabbis can communicate with each other and share resources.
Rabbi Hub should allow:
•	Rabbi-only announcements
•	Shared source sheets
•	Shared review questions
•	Planning discussion
•	Ability for a rabbi to select shared questions/resources and post them into his own chaburah
This is separate from regular user posts.
Rabbi needs to be able to:

Content Management
•	Upload source sheets 
•	Upload review sheets 
•	Upload shiur recordings 
•	Post announcements 
•	Schedule reminders 
•	Pin important posts 
Review Management
•	Add review questions 
•	Import questions from Rabbi Library 
•	Enable/disable questions 
•	Reorder questions 
•	Assign questions by week
•	Allow Moderated discussion from all participants in that chaburah (default is not allowed)
•	Require permission for users to join his chaburah (default is allow all users to join)
Ask the Rav
•	View submitted questions 
•	Answer questions 
•	Mark answer: 
o	Public 
o	Private 
•	Search previous questions
Rabbi Collaboration
•	Share source sheets 
•	Share review questions 
•	Share announcements 
•	Discuss curriculum

Admin page (for Local Admins)

Local admins are focused on their specific chaburah.
Chaburah Management
Edit Chaburah Information
•	Name 
•	Address 
•	Schedule 
•	Zoom link 
•	Description 
•	Rabbi assignment
Manage Members
View:
•	Active members 
•	New members 
•	Pending requests 
Actions:
•	Approve member 
•	Remove member 
•	Transfer member 
•	Make local admin
•	Allow Moderated discussion from all participants in that chaburah (default is not allowed)
•	Require permission for users to join his chaburah (default is allow all users to join)
Local Announcements
Create:
•	Reminder 
•	Shiur cancelled 
•	Location change 
•	Bechina reminder 
________________________________________
Local Files
Upload:
•	Source sheets 
•	Review sheets 
•	Local recordings
Global Admin Console
This is SCP headquarters.
Only visible to SCP leadership (Global Admins).
User Management
View all users.
Approve:
•	Rabbi requests 
•	Admin requests
Chaburah Management
Create:
•	New city 
•	New chaburah 
Edit:
•	Schedule 
•	Rabbi 
•	Address 
Archive:
•	Inactive chaburah
Global Announcements
Post: 
Example
New Zman begins Sunday Bechina registration opens
Appears on everyone's dashboard.
Analytics Dashboard
This may become your killer admin feature.
Example:
Active Chaburos: 173

Active Users: 2,481

Questions Answered:
54,129

Average Readiness:
84%
Review Question Library
Global Admin uploads questions once → Rabbi selects questions → Chaburah gets quizzes automatically.
That saves rabbis time every week and gives participants a reason to open the app repeatedly.


Ask the Rav Feature
Create an Ask the Rav feature.
Participants can submit questions to their local rabbi.
Rabbis can:
•	View submitted questions
•	Answer questions
•	Mark answers as private or public
•	Build a searchable archive over time
This feature is important because over time it becomes a valuable halachic Q&A library.
 
Rabbi Value Proposition
The feature that convinces rabbis to use mySCP:
Upload once, reach everyone.
A rabbi should be able to:
•	Upload source sheet
•	Schedule reminder
•	Attach recording
•	Post announcement
in under 30 seconds.
Participant Value Proposition
The feature that convinces participants to install mySCP:
One-tap access to:
•	Every source sheet
•	Every recording
•	Missed shiur recovery
•	Progress tracker
•	Bechina prep
•	Ask the Rav
Security Requirements
Security is very important.
Use Supabase Row Level Security.
Rules:
•	Participants can only access their own profile, their own chaburah, public/global resources, and permitted files.
•	Rabbis can manage only their assigned chaburah.
•	Local admins can manage only their assigned chaburah.
•	Global admins can manage everything.
•	Rabbi/admin role requests require approval.
•	Files should not be publicly exposed unless marked public.
•	Storage access should respect permissions.
•	Ask the Rav private answers should only be visible to the asker, assigned rabbi, and admins.

IMPORTANT:

Prefer boring, stable, production-quality code over clever code.

Use widely adopted Expo and Supabase patterns.

Avoid experimental libraries.

Minimize dependencies.

Keep files small and modular.

Assume a single developer will maintain this project.

PROJECT ROADMAP

The project will be built in the following checkpoints:

Checkpoint 1
- Expo app shell
- Fake data
- Navigation
- Core screens

Checkpoint 2
- Dashboard polish
- My Chaburah page
- Directory page

Checkpoint 3
- Review system with fake questions

Checkpoint 4
- Files section with fake files

Checkpoint 5
- Profile and settings

Checkpoint 6
- Supabase connection

Checkpoint 7
- Authentication

Checkpoint 8
- Profiles table

Checkpoint 9
- Chaburos and memberships

Checkpoint 10
- Roles and permissions

Checkpoint 11
- Row Level Security

Checkpoint 12
- Storage and uploads

Checkpoint 13
- Rabbi Hub

Checkpoint 14
- Admin tools

Checkpoint 15
- Global Admin tools

Checkpoint 16
- Review question library

Checkpoint 17
- Ask the Rav

Checkpoint 18
- Push notifications

Checkpoint 19
- Final cleanup and deployment
When creating fake data, structure it exactly how it will eventually exist in Supabase.

Use:
- interfaces
- TypeScript types
- mock data files

so that the fake data can later be replaced with Supabase queries with minimal code changes.
Use a feature-based folder structure.

Example:

src/
features/
dashboard/
chaburah/
files/
review/
directory/
ask-rav/
rabbi-hub/
admin/
global-admin/
profile/

Avoid putting all code into a generic components folder.

UI FIRST APPROACH

For the first 5 checkpoints:

Focus on:
- Layout
- Navigation
- User experience
- Component structure
- Fake data

Do not optimize for backend functionality yet.

The goal is to get the application looking and
feeling correct before connecting Supabase.

CURRENT TASK

Build Checkpoint 1 only.

Use everything above as product context.

Do not create anything for future checkpoints.

Do not generate SQL.
Do not create schema.sql.
Do not create reset.sql.
Do not create migrations.
Do not connect Supabase.
Do not create authentication.
Do not create storage.	
Do not create RLS.

Create only:

1. Expo Router project structure
2. TypeScript configuration
3. Navigation
4. Dashboard screen
5. My Chaburah screen
6. Files screen
7. Review screen
8. Directory screen
9. Ask the Rav screen
10. Rabbi Hub placeholder
11. Admin placeholder
12. Global Admin placeholder
13. Profile screen
14. Fake data for:
   - Users
   - Chaburos
   - Announcements
   - Files
   - Review questions

Use:
- Expo
- Expo Router
- TypeScript

The project must run with:

npm install
npx expo start

After generating Checkpoint 1:

1. Explain the folder structure.
2. Tell me what files to create.
3. Give me the complete code.
4. Tell me exactly what commands to run.
5. Tell me what I should see.
6. Stop and wait for my confirmation.
Do not generate Checkpoint 2.
Do not discuss Checkpoint 2.
Wait for me to test Checkpoint 1 first.
