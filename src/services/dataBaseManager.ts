import fs from 'fs';
import path from 'path';

// Interface für Blacklist-Einträge
interface BlacklistEntry {
  email: string;
  blockedAt: string;
  reason?: string;
}

export class BlacklistManager {

    private folderPath: string;
    private fileName: string;
    private filePath: string;
    private backUpName: string;
    private blackList: BlacklistEntry[];

    constructor(folderPath: string = path.join(process.cwd(), 'database'), fileName: string = "blackList.json") {
        this.folderPath = folderPath;
        this.fileName = fileName;
        this.filePath = path.join(this.folderPath, this.fileName);
        this.blackList = [];
        this.backUpName = this.fileName.replace(/(\.[^\.]+)$/, '_Backup$1');

        this.loadData();
    }

    private ensureDirectoryExists(folderPath: string = this.folderPath): void {
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
            console.log(`>> Folder '${folderPath}' was created.`);
        }
    }

    private ensureFileExists(filePath: string = this.filePath): void {

        if (!fs.existsSync(filePath)) {
            const currentDate = new Date();
            const initialContent: BlacklistEntry[] = [
                { 
                    email: "user1@domain.com", 
                    blockedAt: this.formatDate(currentDate), 
                    reason: "Spam" 
                },
                { 
                    email: "blocked.email@example.org", 
                    blockedAt: this.formatDate(currentDate), 
                    reason: "Scam" 
                }
            ];

            fs.writeFileSync(filePath, JSON.stringify(initialContent, null, 2));
            this.blackList = initialContent;
            console.log(`>> File '${this.fileName}' was created with initial data.`);
        }
    }

    private createBackUp(): void {
        const backupFilePath = path.join(this.folderPath, this.backUpName);
        try {
            fs.copyFileSync(this.filePath, backupFilePath);
            console.log(`>> Backup of the Blacklist was created: ${backupFilePath}`);

        } catch (error) {
            console.error('>> Error while creating the backup:', error);
        }
    }

    private loadData(): void {
        try {
            this.ensureDirectoryExists();
            this.ensureFileExists();
            const fileContent = fs.readFileSync(this.filePath, 'utf-8');
            this.blackList = JSON.parse(fileContent);

        } catch (error) {
            console.error('>> Error while loading the Blacklist:', error);
        }
    }

    saveData(): void {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.blackList, null, 2));
            this.createBackUp();
            console.log('>> Blacklist was saved successfully.');

        } catch (error) {
            console.error('>> Error while saving the Blacklist: ', error);
        }
    }

    getBlacklist(): BlacklistEntry[] {
        this.loadData();
        return this.blackList;
    }

    addMailToList(email: string, reason: string = "Spam"): void {
        this.loadData();
        const cleanEmail = email.trim().toLowerCase();
        const currentDate = new Date();
        const newEntry: BlacklistEntry = {
            email: cleanEmail,
            blockedAt: this.formatDate(currentDate),
            reason
        };
        
        this.blackList.push(newEntry);
        console.log('>> Blacklist was updated.');
        this.saveData();
    }

    removeMailFromList(email: string): boolean {
        this.loadData();
        const cleanEmail = email.trim().toLowerCase();
        const initialLength = this.blackList.length;
        this.blackList = this.blackList.filter(entry => entry.email !== cleanEmail);
        const wasRemoved = this.blackList.length < initialLength;

        if (wasRemoved) {
            console.log(`>> E-Mail '${email}' was removed from the blacklist.`);
            this.saveData();
        } else {
            console.log(`>> E-Mail '${email}' was not found in the blacklist.`);
        }
        return wasRemoved;
    }

    public isBlockedMail(email: string): boolean {
        this.loadData();
        const cleanEmail = email.trim().toLowerCase();
        return this.blackList.some(entry => entry.email.toLowerCase() === cleanEmail);
    }

    clearList(): void {
        this.blackList = [];
        this.saveData();
        console.log('>> Blacklist cleared.');
    }

    private formatDate(date: Date): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }
}