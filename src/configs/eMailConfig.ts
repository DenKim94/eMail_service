import { EmailConfig, ProviderTypes } from '../types/serviceTypes';


export const getEmailConfig = (provider: ProviderTypes): EmailConfig => {
    let hostName = "";

    switch (provider) {
        case 'gmail':
            hostName = 'smtp.gmail.com';
            break;

        case 'gmx':
            hostName = 'mail.gmx.net';
            break;

        default:
            throw new Error(`Unsupported email provider: ${provider}`);
    }

    return {
        host: hostName,
        port: 587,
        secure: false, // true für SSL (Port 465), false für STARTTLS
        auth: {
            user: process.env.USER_EMAIL!,
            pass: process.env.PROVIDER_PASSWORD!
        }
    };
};
