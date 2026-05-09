import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import type { UserProfile, ISONews } from '../lib/types';

// Test users to seed
const testUsers: Omit<UserProfile, 'uid' | 'createdAt'>[] = [
    {
        email: 'auditor@example.com',
        displayName: 'John Auditor',
        role: 'Auditor',
        department: 'Quality Assurance'
    },
    {
        email: 'manager@example.com',
        displayName: 'Jane Manager',
        role: 'Auditee',
        department: 'IT Department'
    }
];

// Dummy ISO news
const isoNews: Omit<ISONews, 'id'>[] = [
    {
        title: 'ISO 9001:2024 Updates Released',
        link: 'https://www.iso.org/news',
        date: Timestamp.fromDate(new Date('2024-01-15'))
    },
    {
        title: 'New Guidelines for Risk Management',
        link: 'https://www.iso.org/news',
        date: Timestamp.fromDate(new Date('2024-02-01'))
    },
    {
        title: 'ISO 27001 Certification Best Practices',
        link: 'https://www.iso.org/news',
        date: Timestamp.fromDate(new Date('2024-02-10'))
    }
];

/**
 * Seed users into Firebase Auth and Firestore
 * Password for all test users: password123
 */
export async function seedUsers(): Promise<void> {
    console.log('Seeding users...');

    for (const userData of testUsers) {
        try {
            // Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                userData.email,
                'password123'
            );

            const uid = userCredential.user.uid;

            // Create user profile in Firestore
            const userProfile: UserProfile = {
                uid,
                email: userData.email,
                displayName: userData.displayName,
                role: userData.role,
                department: userData.department,
                createdAt: Timestamp.now()
            };

            await setDoc(doc(db, 'users', uid), userProfile);
            console.log(`Created user: ${userData.email} with role: ${userData.role}`);
        } catch (error: any) {
            if (error.code === 'auth/email-already-in-use') {
                console.log(`User ${userData.email} already exists, skipping...`);
            } else {
                console.error(`Error creating user ${userData.email}:`, error);
            }
        }
    }

    console.log('Users seeding complete!');
}

/**
 * Seed ISO news into Firestore
 */
export async function seedISONews(): Promise<void> {
    console.log('Seeding ISO news...');

    const newsCollection = collection(db, 'iso_news');

    for (let i = 0; i < isoNews.length; i++) {
        const newsItem = isoNews[i];
        const docId = `news-${i + 1}`;

        try {
            await setDoc(doc(newsCollection, docId), newsItem);
            console.log(`Created news: ${newsItem.title}`);
        } catch (error) {
            console.error(`Error creating news ${newsItem.title}:`, error);
        }
    }

    console.log('ISO news seeding complete!');
}

/**
 * Run all seed functions
 */
export async function seedAll(): Promise<void> {
    await seedUsers();
    await seedISONews();
    console.log('All seeding complete!');
}
