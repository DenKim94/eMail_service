export const missingRequiredFields = [
    {
      missingField: 'senderName',
      testData: { senderName: null, senderEmail: 'test@example.com', subject: 'Test', message: 'Test message' },
      expectedError: 'Sender name is required'
    },
    {
      missingField: 'senderEmail',
      testData: { senderName: 'Test Sender', senderEmail: null, subject: 'Test', message: 'Test message' },
      expectedError: 'Sender email is required'
    },
    {
      missingField: 'subject',
      testData: { senderName: 'Test Sender', senderEmail: 'test@example.com', subject: null, message: 'Test message' },
      expectedError: 'Subject is required'
    },
    {
      missingField: 'message',
      testData: { senderName: 'Test Sender', senderEmail: 'test@example.com', subject: 'Test', message: null },
      expectedError: 'Message is required'
    },
  ];

  