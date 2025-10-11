const sentEmails = [];

console.log('🔧 Nodemailer mock loaded!');

const mockSendMail = jest.fn().mockImplementation((mailOptions) => {
  sentEmails.push(mailOptions);
  return Promise.resolve({
    messageId: `<${Date.now()}@test.example.com>`,
    accepted: [mailOptions.to],
    rejected: [],
    response: '250 Message accepted for delivery',
  });
});

const mockVerify = jest.fn().mockResolvedValue(true);
const mockClose = jest.fn().mockResolvedValue(undefined);

const mockTransporter = {
  sendMail: mockSendMail,
  verify: mockVerify,
  close: mockClose,
};

const mockCreateTransport = jest.fn().mockReturnValue(mockTransporter);

// Mock-Hilfsfunktionen für Tests
const mock = {
  getSentMail: () => [...sentEmails],
  
  reset: () => {
    sentEmails.length = 0;
    mockSendMail.mockClear();
    mockVerify.mockClear();
    mockClose.mockClear();
    mockCreateTransport.mockClear();
    mockVerify.mockResolvedValue(true);
  },
  
  setShouldFail: (shouldFail, errorMessage = 'Email sending failed') => {
    if (shouldFail) {
      mockSendMail.mockRejectedValueOnce(new Error(errorMessage));
    } else {
      mockSendMail.mockResolvedValue({
        messageId: `<${Date.now()}@test.example.com>`,
        accepted: ['test@example.com'],
        rejected: [],
        response: '250 Message accepted',
      });
    }
  },

  setVerifyFails: (shouldFail) => {
    if (shouldFail) {
      mockVerify.mockRejectedValueOnce(new Error('SMTP verification failed'));
    } else {
      mockVerify.mockResolvedValue(true);
    }
  },
};

// WICHTIG: CommonJS-Export für Node-Module
module.exports = {
  createTransport: mockCreateTransport,
  mock: mock,
};
