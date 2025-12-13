<div align="center">
      <h1> <img src="https://cdn-icons-png.flaticon.com/128/4277/4277508.png"><br/>Ryde</h1>
     </div>
<p align="center"> <a href="https://x.com/arush_singh03" target="_blank"><img alt="" src="https://img.shields.io/badge/Twitter-1DA1F2?style=normal&logo=twitter&logoColor=white" style="vertical-align:center" /></a> <a href="https://www.instagram.com/arushsingh03/" target="_blank"><img alt="" src="https://img.shields.io/badge/Instagram-E4405F?style=normal&logo=instagram&logoColor=white" style="vertical-align:center" /></a> <a href="https://www.linkedin.com/in/arushsingh03}" target="_blank"><img alt="" src="https://img.shields.io/badge/LinkedIn-0077B5?style=normal&logo=linkedin&logoColor=white" style="vertical-align:center" /></a> </p>

# Description
The Ryde or Uber-clone is a React Native-based mobile application that mimics the core functionalities of ride-hailing services like Uber. The project focuses on building a robust and user-friendly platform that allows users to book rides, view ride details, and make payments seamlessly. The application integrates multiple technologies and services such as Clerk for authentication, Google Maps APIs for location and routing, Stripe for payment processing, NeonDB for database management, and TailwindCSS for styling.

# Features

# User Authentication (Clerk):

- Secure and scalable user authentication with Clerk.
- Support for multiple authentication methods including email, password, and social logins (Google, Facebook, etc.).
- Account management features such as profile updates, password resets, and two-factor authentication.

# Location and Navigation (Google Maps APIs):

- Real-time location tracking using Google Maps.
- Display of available drivers and user location on the map.
- Route suggestions, distance calculations, and estimated time of arrival (ETA).
- Integration of location-based features like pickup and drop-off point selection.

# Payment Processing (Stripe):

- Seamless and secure payments with Stripe.
- Support for multiple payment methods including credit/debit cards, digital wallets, etc.
- Automated fare calculation based on distance and time.
- Invoice generation and transaction history tracking.

# Database Management (NeonDB):

- Cloud-based database with NeonDB for managing user, driver, and ride data.
- Real-time data synchronization and offline support.
- Efficient data handling with support for complex queries and relationships.

# Styling and UI (TailwindCSS):

- Modern and responsive UI with TailwindCSS.
- Predefined and custom styles for a consistent and visually appealing design.
- Mobile-first approach to ensure smooth performance on all devices.
- 
# Screenshots
<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 200px;">
 <h2> Landing Page </h2><br><p align="center" ><img src="https://github.com/arushsingh03/uber-clone/blob/main/assets/screenshots/Landing%20Page%201.jpg" style="width: 320px; height: 700px;">
 <img src = "https://github.com/arushsingh03/uber-clone/blob/main/assets/screenshots/Landing%20Page%202.jpg" style="width: 320px; height: 700px;"> 
 <img src = "https://github.com/arushsingh03/uber-clone/blob/main/assets/screenshots/Landing%20Page%203.jpg" style="width: 320px; height: 700px;"></p>
 <h2> Sing-Up & Home Screen Page </h2><br> <p align="center" ><img src="https://github.com/arushsingh03/uber-clone/blob/main/assets/screenshots/Sign%20Up%20Interface.jpg" style="width: 320px; height: 700px;">
 <img src="https://github.com/arushsingh03/uber-clone/blob/main/assets/screenshots/Home%20Page.jpg" style="width: 320px; height: 700px;">
<img src= "https://github.com/arushsingh03/uber-clone/blob/main/assets/screenshots/Home%20Page%20After%20Booking%20Ride.jpg" style="width: 320px; height: 700px;"></p>
<h2> Book Ride & Confirm Ride Page </h2><br> <p align="center" ><img src="https://github.com/arushsingh03/uber-clone/blob/main/assets/screenshots/Ride%20Selection%20Page.jpg" style="width: 320px; height: 700px;"> 
<img src="https://github.com/arushsingh03/uber-clone/blob/main/assets/screenshots/Payment%20Interface%20.jpg" style="width: 320px; height: 700px;"> 
<img src="https://github.com/arushsingh03/uber-clone/blob/main/assets/screenshots/Payment%20Confirm%20Page.jpg" style="width: 320px; height: 700px;"></p> 
<h2> Profile Page </h2><br><p align="center" ><img src="https://github.com/arushsingh03/uber-clone/blob/main/assets/screenshots/Profile%20Page.jpg" style="width: 320px; height: 700px;"></p>
</div>

# Tech Used
 ![React Native](https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![Postgres](https://img.shields.io/badge/postgres-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white) ![Expo](https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37) ![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white) ![NPM](https://img.shields.io/badge/NPM-%23000000.svg?style=for-the-badge&logo=npm&logoColor=white) ![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E) ![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
      
# Set up the project locally on your machine.:
#### Prerequisites
Make sure you have the following installed on your machine:
- [git]("https://github.com/")
- [Node js]("https://nodejs.org/en")

#### Clone the Respsitory:
`git clone https://github.com/arushsingh03/uber-clone`
#### Installation
Install the project dependencies using npm:
`npm install`

### API references
| Syntax | Description |
| ----------- | ----------- |
| CLERK_SECRET_KEY | Clerk is used for auth and user management, get keys from [here]("https://clerk.com/") |
| PLACES_API_KEY | This API provides data about geographical locations such as businesses, landmarks, and other points of interest |
| DIRECTION_API_KEY | This API is particularly valuable for apps that involve location-based services, such as maps, navigation, logistics, and travel planning. |
| DATABASE_URL | Connection url for any MySQL database, or use [neon]("https://neon.tech/") |
| GEOAPIFY_API_KEY |The Geoapify API Key is used to access Geoapify's suite of geolocation and mapping APIs, which provide a variety of location-based services.|
| STRIPE_SECRET_KEY | Stripe used to securely manage all server-side operations involving payments, transactions, and sensitive customer data. |

#### Running Project   
`npx expo start`
 
#### If everything goes well, the app will be running at:
Expo Go mobile app after configuring  

      
<!-- </> with 💛 by readMD (https://readmd.itsvg.in) -->
    
