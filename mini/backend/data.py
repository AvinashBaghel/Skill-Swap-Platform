"""
Seed data for SkillSwap — mirrors the userData object in profile.js
Only 3 example profiles are included. Real users register via signup.
"""

SEED_USERS = {
    "jake": {
        "id": "jake",
        "name": "Jake Morrison",
        "initials": "JM",
        "title": "Professional Musician & Composer",
        "rating": "4.9",
        "students": "34",
        "location": "Austin, TX",
        "bio": "I've been playing guitar for 15 years and touring with bands for 5. I love breaking down complex theory into simple, practical chunks.",
        "offered": ["Guitar Playing", "Music Theory", "Songwriting"],
        "wanted": ["Web Design", "Video Editing"],
        "greeting": "Hey there! Ready to jam and share some web design tips?",
        "availability": {
            "days": ["Mon", "Wed", "Fri"],
            "from": "10:00",
            "to": "17:00",
            "timezone": "EST (UTC-5)"
        },
        "password": "hashed_placeholder"
    },
    "sara": {
        "id": "sara",
        "name": "Sara Reyes",
        "initials": "SR",
        "title": "Senior Frontend Developer",
        "rating": "4.8",
        "students": "52",
        "location": "Remote",
        "bio": "Passionate about React, CSS, and creating beautiful, accessible interfaces. Happy to help beginners land their first tech job!",
        "offered": ["Web Development", "CSS Animation", "React"],
        "wanted": ["Spanish", "Cooking"],
        "greeting": "Hi! Let's hook up some Spanish lessons for React debugging!",
        "availability": {
            "days": ["Mon", "Tue", "Wed", "Thu", "Fri"],
            "from": "09:00",
            "to": "18:00",
            "timezone": "PST (UTC-8)"
        },
        "password": "hashed_placeholder"
    },
    "maria": {
        "id": "maria",
        "name": "Maria Cruz",
        "initials": "MC",
        "title": "Native Spanish Speaker & Educator",
        "rating": "4.7",
        "students": "20",
        "location": "Madrid, ES",
        "bio": "I teach conversational Spanish with an emphasis on local idioms and culture. Looking to learn photography for my travel blog.",
        "offered": ["Spanish Language", "Literature"],
        "wanted": ["Photography", "Photo Editing"],
        "greeting": "Hola! So excited to exchange languages and skills.",
        "availability": {
            "days": ["Tue", "Thu", "Sat"],
            "from": "14:00",
            "to": "20:00",
            "timezone": "CET (UTC+1)"
        },
        "password": "hashed_placeholder"
    }
}
