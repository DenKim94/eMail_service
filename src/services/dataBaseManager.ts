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
    private blackList: BlacklistEntry[];

    constructor(folderPath: string = path.join(process.cwd(), 'database'), fileName: string = "blackList.json") {
        this.folderPath = folderPath;
        this.fileName = fileName;
        this.filePath = path.join(this.folderPath, this.fileName);
        this.blackList = [];

        this.ensureDirectoryExists();
        this.ensureFileExists();
    }

    private ensureDirectoryExists(): void {
        if (!fs.existsSync(this.folderPath)) {
            fs.mkdirSync(this.folderPath, { recursive: true });
            console.log(`>> Ordner '${this.folderPath}' wurde erstellt.`);
        }
    }

    private ensureFileExists(): void {

        if (!fs.existsSync(this.filePath)) {
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
        
        fs.writeFileSync(this.filePath, JSON.stringify(initialContent, null, 2));
        this.blackList = initialContent;
        console.log(`>> Datei '${this.fileName}' wurde mit Initialdaten erstellt.`);

        } else {
            this.loadData();
        }
    }

    private loadData(): void {
        try {
        const fileContent = fs.readFileSync(this.filePath, 'utf-8');
        this.blackList = JSON.parse(fileContent);

        } catch (error) {
        console.error('>> Fehler beim Laden der Blacklist:', error);
        }
    }

    saveData(): void {
        try {
        fs.writeFileSync(this.filePath, JSON.stringify(this.blackList, null, 2));
        console.log('>> Blacklist erfolgreich gespeichert.');

        } catch (error) {
        console.error('>> Fehler beim Speichern der Blacklist: ', error);
        }
    }

    getBlacklist(): BlacklistEntry[] {
        return this.blackList;
    }

    addMailToList(email: string, reason: string = "Spam"): void {
        const cleanEmail = email.trim().toLowerCase();
        const currentDate = new Date();
        const newEntry: BlacklistEntry = {
            email: cleanEmail,
            blockedAt: this.formatDate(currentDate),
            reason
        };
        
        this.blackList.push(newEntry);
        console.log('>> Blacklist wurde aktualisiert.');
        this.saveData();
    }

    removeMailFromList(email: string): boolean {
        const cleanEmail = email.trim().toLowerCase();
        const initialLength = this.blackList.length;
        this.blackList = this.blackList.filter(entry => entry.email !== cleanEmail);
        const wasRemoved = this.blackList.length < initialLength;

        if (wasRemoved) {
            console.log(`>> E-Mail '${email}' wurde aus der Blacklist entfernt.`);
            this.saveData();
        } else {
            console.log(`>> E-Mail '${email}' war nicht in der Blacklist.`);
        }
        return wasRemoved;
    }

    public isBlockedMail(email: string): boolean {
        const cleanEmail = email.trim().toLowerCase();
        return this.blackList.some(entry => entry.email === cleanEmail);
    }

    clearList(): void {
        this.blackList = [];
        this.saveData();
        console.log('>> Blacklist wurde geleert.');
    }

    private formatDate(date: Date): string {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }
}