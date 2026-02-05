# Coffee Chat - Professional Networking Platform

A beautiful, modern web application for building genuine professional connections through coffee chats and networking.

## Features

### Core Features
- **User Authentication** - Supabase Auth with email/password signup and login
- **Profile Management** - Complete profiles with avatar, resume, bio, hobbies, and interests
- **Smart Recommendations** - AI-powered matching based on industry, interests, hobbies, and location
- **Advanced Search** - Multi-filter discovery (name, industry, location, interests, company)
- **Feed** - Social feed with posts and likes
- **Events** - Create and RSVP to networking events (virtual, in-person, hybrid)
- **Messaging** - Direct messaging with conversation threading
- **Connections** - Build your professional network
- **Availability Calendar** - Set your weekly availability for meetings
- **Calendar & Scheduling** - Schedule coffee chats and manage meetings
- **Communities** - Join industry-specific groups
- **Video Calls** - Built-in video calling interface (UI ready)

## Tech Stack

- **Frontend**: Pure HTML, CSS, and JavaScript
- **Backend**: Supabase (PostgreSQL database)
- **Authentication**: Supabase Auth
- **Hosting**: Vercel
- **Fonts**: Google Fonts (Sora & Playfair Display)
- **Design**: Responsive, mobile-friendly interface

## Database Schema

Complete database schema with:
- User profiles with interests and hobbies
- Connections and networking
- Posts with likes and comments
- Events with RSVP system
- Messages and conversations
- Availability scheduling
- Groups and communities
- Row Level Security (RLS) policies

## Getting Started

### Prerequisites
- A Supabase account and project
- The database schema set up (see `supabase-schema.sql`)

### Setup
1. Clone the repository
2. Set up your Supabase project
3. Run the SQL schema in Supabase SQL Editor
4. Update the Supabase credentials in the code
5. Deploy to Vercel or open `index.html` locally

### Usage
1. Sign up with a new account
2. Complete your profile with hobbies and interests
3. Discover professionals with smart recommendations
4. Connect with people in your industry
5. Create posts and events
6. Set your availability for meetings
7. Start networking!
