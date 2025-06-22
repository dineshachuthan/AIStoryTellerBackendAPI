import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  throw new Error("SENDGRID_API_KEY environment variable must be set");
}

const mailService = new MailService();
mailService.setApiKey(process.env.SENDGRID_API_KEY);

export interface InvitationEmailData {
  recipientEmail: string;
  recipientName?: string;
  characterName: string;
  storyTitle: string;
  invitationLink: string;
  senderName: string;
}

export async function sendRoleplayInvitation(data: InvitationEmailData): Promise<boolean> {
  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; text-align: center;">You're Invited to a Roleplay!</h2>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="font-size: 16px; margin-bottom: 15px;">
            Hi ${data.recipientName || 'there'}!
          </p>
          
          <p style="font-size: 16px; margin-bottom: 15px;">
            <strong>${data.senderName}</strong> has invited you to participate in a collaborative roleplay story!
          </p>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0;"><strong>Story:</strong> ${data.storyTitle}</p>
            <p style="margin: 10px 0 0 0;"><strong>Your Character:</strong> ${data.characterName}</p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Click the button below to join the roleplay and record your character's voice for the story!
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.invitationLink}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: bold;">
              Join Roleplay as ${data.characterName}
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${data.invitationLink}">${data.invitationLink}</a>
          </p>
        </div>
        
        <div style="text-align: center; font-size: 12px; color: #888; margin-top: 30px;">
          <p>This is an automated invitation from our storytelling platform.</p>
        </div>
      </div>
    `;

    const textContent = `
You're Invited to a Roleplay!

Hi ${data.recipientName || 'there'}!

${data.senderName} has invited you to participate in a collaborative roleplay story!

Story: ${data.storyTitle}
Your Character: ${data.characterName}

Click this link to join the roleplay and record your character's voice:
${data.invitationLink}

Thank you for participating in our storytelling community!
    `;

    await mailService.send({
      to: data.recipientEmail,
      from: 'noreply@storytelling.app', // You may need to verify this domain with SendGrid
      subject: `Roleplay Invitation: Play ${data.characterName} in "${data.storyTitle}"`,
      text: textContent,
      html: htmlContent,
    });

    console.log(`Roleplay invitation sent to ${data.recipientEmail} for character ${data.characterName}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

export async function sendSMSInvitation(phoneNumber: string, data: Omit<InvitationEmailData, 'recipientEmail'>): Promise<boolean> {
  // SMS functionality would require a service like Twilio
  // For now, we'll log that SMS is not implemented
  console.log(`SMS invitation to ${phoneNumber} for character ${data.characterName} - SMS service not configured`);
  return false;
}