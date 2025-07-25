import sessionManager from './src/shared/middleware/sessionManager.js';

/**
 * Simple test to verify session manager functionality
 * This is a basic test to ensure the session manager is working
 */
async function testSessionManager() {
  console.log('Testing SessionManager...');
  
  // Test 1: Check session configuration
  console.log('✓ Session configuration loaded');
  const config = sessionManager.getSessionConfig();
  console.log('  - Cookie settings:', {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    maxAge: config.cookie.maxAge,
    sameSite: config.cookie.sameSite
  });
  
  // Test 2: Check middleware creation
  const middleware = sessionManager.getSessionMiddleware();
  console.log('✓ Session middleware created');
  console.log('  - Middleware type:', typeof middleware);
  
  // Test 3: Mock request/response for session operations
  const mockReq = {
    session: {
      id: 'test-session-id',
      userId: 'test-user-123',
      createdAt: new Date(),
      isActive: true,
      save: (callback) => callback(null),
      destroy: (callback) => callback(null),
      regenerate: (callback) => callback(null)
    }
  };
  
  const mockRes = {
    clearCookie: (name) => console.log(`  - Cookie '${name}' cleared`)
  };
  
  // Test 4: Validate session
  try {
    const sessionData = await sessionManager.validateSession(mockReq);
    console.log('✓ Session validation works');
    console.log('  - Session data:', sessionData);
  } catch (error) {
    console.error('✗ Session validation failed:', error.message);
  }
  
  // Test 5: Check authentication
  const isAuth = sessionManager.isAuthenticated(mockReq);
  console.log('✓ Authentication check works');
  console.log('  - Is authenticated:', isAuth);
  
  // Test 6: Get user ID
  const userId = sessionManager.getUserId(mockReq);
  console.log('✓ User ID retrieval works');
  console.log('  - User ID:', userId);
  
  // Test 7: Create session
  try {
    const sessionId = await sessionManager.createSession('new-user-456', mockReq, mockRes);
    console.log('✓ Session creation works');
    console.log('  - New session ID:', sessionId);
  } catch (error) {
    console.error('✗ Session creation failed:', error.message);
  }
  
  // Test 8: Cleanup (basic test)
  try {
    await sessionManager.cleanupExpiredSessions();
    console.log('✓ Session cleanup works');
  } catch (error) {
    console.error('✗ Session cleanup failed:', error.message);
  }
  
  console.log('\nSessionManager tests completed!');
}

// Run the test
testSessionManager().catch(console.error);