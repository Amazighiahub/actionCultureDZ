// Test the getSitePatrimonialById function directly
const db = require('./models');
const PatrimoineController = require('./controllers/PatrimoineController');

async function test() {
  try {
    console.log('Creating controller...');
    const controller = new PatrimoineController(db);

    // Mock request and response
    const req = {
      params: { id: '1' },
      lang: 'fr'
    };

    const res = {
      json: (data) => {
        console.log('Response JSON:', JSON.stringify(data, null, 2).substring(0, 2000));
      },
      status: (code) => {
        console.log('Response status:', code);
        return {
          json: (data) => console.log('Error response:', JSON.stringify(data))
        };
      }
    };

    console.log('Calling getSitePatrimonialById...');
    await controller.getSitePatrimonialById(req, res);

  } catch (err) {
    console.error('Test Error:', err.message);
    console.error('Stack:', err.stack);
  }
  process.exit(0);
}

test();
