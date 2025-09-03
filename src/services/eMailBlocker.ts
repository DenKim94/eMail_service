import dotenv from 'dotenv';
import { BlacklistManager } from './dataBaseManager';

dotenv.config();
const { EMAIL_BLACKLIST } = process.env;

export class EmailBlocker {
    private blockedEmails: string[];
    private BlacklistManager: BlacklistManager;

    constructor() {
        this.BlacklistManager = new BlacklistManager();
        this.blockedEmails = this.BlacklistManager.getBlacklist().map(entry => entry.email);

        console.log('>> Blocked emails:', this.blockedEmails);
    }

    blockAddress(email: string): void {
        const cleanEmail = email.trim().toLowerCase();
        if (!this.blockedEmails.includes(cleanEmail)) {
            this.BlacklistManager.addMailToList(cleanEmail);
        }
    }

    unblockAddress(email: string): void {
        const cleanEmail = email.trim().toLowerCase();
        const wasRemoved = this.BlacklistManager.removeMailFromList(cleanEmail);

        wasRemoved ? this.blockedEmails = this.BlacklistManager.getBlacklist().map(entry => entry.email) : null;
    }

    isBlockedAddress(email: string): boolean {
        const cleanEmail = email.trim().toLowerCase();
        return this.BlacklistManager.isBlockedMail(cleanEmail);
    }

    getBlockedList(): string[] {
        return this.blockedEmails;
    }
}
