export class BlacklistManager {
  private blacklist: Array<{ email: string; blockedAt: string }> = [];

  getBlacklist() {
    return this.blacklist;
  }

  addMailToList(email: string): void {
    if (!this.blacklist.find(entry => entry.email === email)) {
      this.blacklist.push({
        email,
        blockedAt: new Date().toISOString(),
      });
    }
  }

  removeMailFromList(email: string): boolean {
    const index = this.blacklist.findIndex(entry => entry.email === email);
    if (index > -1) {
      this.blacklist.splice(index, 1);
      return true;
    }
    return false;
  }

  isBlockedMail(email: string): boolean {
    return this.blacklist.some(entry => entry.email === email);
  }

  saveData(): void {
    // Mock: Keine echte Datei-Operation
    console.log('Mock: saveData called');
  }

  // Hilfsmethode für Tests zum Zurücksetzen
  reset(): void {
    this.blacklist = [];
  }
}
