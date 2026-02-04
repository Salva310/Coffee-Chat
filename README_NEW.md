# ☕ Coffee Chat

A professional networking platform designed to help professionals build genuine connections through real conversations.

## Features

- **User Authentication** - Sign up and log in with email/password
- **Profile Management** - Create and customize your professional profile with bio, interests, and career goals
- **Discovery** - Find and browse other professionals, filtered by industry
- **Connections** - Build your professional network
- **Messaging** - Chat with your connections in real-time
- **Calendar & Scheduling** - Schedule coffee chats with other professionals
- **Video Calling** - Integrated video calling features
- **Communities** - Join industry-specific groups and forums
- **Posts** - Share insights and updates with your network

## Getting Started

### Running Locally

The application is a single-page HTML app. Simply open `index.html` in your browser:

```bash
# Open in your default browser
open index.html  # macOS
start index.html  # Windows
xdg-open index.html  # Linux
```

Or use a local development server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (with http-server)
npx http-server
```

Then visit `http://localhost:8000` in your browser.

### Quick Login

You can create a test account or any account with:
- **Email**: you@example.com
- **Password**: any password

## Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Storage**: Browser LocalStorage
- **Styling**: Custom CSS with design system variables

## Project Structure

```
/
├── index.html       # Main application file
├── README.md        # Documentation
├── .gitignore       # Git ignore rules
```

## Deployment to Vercel

1. **Push to GitHub** - Make sure your code is committed and pushed
2. **Go to Vercel** - Visit [vercel.com](https://vercel.com)
3. **Connect GitHub** - Sign in and authorize your GitHub account
4. **Import Project** - Click "Add New" → "Project" and select your `Coffee-Chat` repository
5. **Deploy** - Click "Deploy" and your app will be live!

Your app will automatically get a URL like `coffee-chat-xxx.vercel.app`

### Deploy to Other Platforms

This is a static HTML/CSS/JS app, so it works on:
- **GitHub Pages** - Free hosting
- **Netlify** - Drag and drop deployment
- **Firebase Hosting**
- **AWS S3 + CloudFront**
- **Any static hosting provider**

## Features Overview

### Dashboard
- View your connection statistics
- Quick access to main features
- Profile and settings access

### Discovery
- Browse available professionals
- Filter by industry
- View detailed profiles

### Messaging
- Private conversations with connections
- Real-time chat interface
- Message history

### Calendar
- Manage your coffee chat schedule
- Visual calendar view
- Upcoming meetings list

### Scheduling
- Book calls with professionals
- Choose duration and meeting type
- Support for video, Zoom, FaceTime, phone, in-person

### Communities
- Join industry-specific groups
- View group discussions
- Connect with like-minded professionals

## Data Storage

All user data is stored locally in browser LocalStorage. 

To add a backend (PostgreSQL, Firebase, etc.), modify the JavaScript functions that interact with `localStorage`.

## Customization

### Theme Colors
Edit the CSS variables in the `<style>` section of `index.html`:

```css
:root {
    --primary: #6B5B95;
    --accent: #D4A574;
    --success: #4CAF50;
    --danger: #FF6B6B;
}
```

### Mock Data
Update the `mockUsers` and `mockGroups` arrays in the JavaScript section to populate your app with different sample data.

## License

MIT License - feel free to use and modify as needed
