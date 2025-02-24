/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import nodemailer from 'nodemailer';
// Define secrets
const emailUser = defineSecret('EMAIL_USER');
const emailPass = defineSecret('EMAIL_PASS');
const appUrl = defineSecret('APP_URL');
initializeApp();
const db = getFirestore();
export const onPendingInviteCreated = onDocumentCreated({
    document: 'pendingHouseholdMembers/{docId}',
    region: 'us-central1',
    secrets: [emailUser, emailPass, appUrl]
}, async (event) => {
    console.log('Function triggered with document ID:', event.params.docId);
    const snapshot = event.data;
    if (!snapshot) {
        console.error('No data associated with the event');
        return;
    }
    const data = snapshot.data();
    console.log('Document data:', data);
    if (!data || !data.email) {
        console.error('No email found in the document');
        return;
    }
    console.log('Checking configuration...');
    if (!emailUser.value()) {
        console.error('EMAIL_USER not configured');
        return;
    }
    if (!emailPass.value()) {
        console.error('EMAIL_PASS not configured');
        return;
    }
    if (!appUrl.value()) {
        console.error('APP_URL not configured');
        return;
    }
    console.log('Creating nodemailer transport...');
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser.value(),
            pass: emailPass.value()
        }
    });
    const mailOptions = {
        from: emailUser.value(),
        to: data.email,
        subject: 'You have been invited to join a household!',
        html: `
      <h2>You've been invited to join a household!</h2>
      <p>${data.invitedByEmail || 'Someone'} has invited you to join their household.</p>
      <p>Click the button below to accept the invitation:</p>
      <a href="${appUrl.value()}/accept-invite?id=${snapshot.id}" 
         style="display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
        Accept Invitation
      </a>
      <p style="margin-top: 20px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${appUrl.value()}/accept-invite?id=${snapshot.id}</p>
      <p style="color: #666; margin-top: 20px;">This invitation will expire in 24 hours.</p>
    `
    };
    try {
        console.log('Attempting to send email to:', data.email);
        await transporter.sendMail(mailOptions);
        console.log('Email sent successfully');
        // Update the document to mark email as sent
        await snapshot.ref.update({
            emailSent: true,
            emailSentAt: Timestamp.now()
        });
        console.log('Document updated with email status');
    }
    catch (error) {
        console.error('Error sending email:', error);
        // Log specific error details
        if (error instanceof Error) {
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
        }
        // Try to log the error response if available
        if (error && typeof error === 'object' && 'response' in error) {
            console.error('SMTP Response:', error.response);
        }
    }
});
export const cleanupExpiredInvitationsDaily = onSchedule({
    schedule: '0 0 * * *',
    timeZone: 'America/New_York',
}, async (event) => {
    const now = Timestamp.now();
    const oneDayAgo = new Timestamp(now.seconds - (24 * 60 * 60), now.nanoseconds);
    const snapshot = await db.collection('pendingHouseholdMembers')
        .where('createdAt', '<', oneDayAgo)
        .get();
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Cleaned up ${snapshot.size} expired invitations`);
});
//# sourceMappingURL=index.js.map