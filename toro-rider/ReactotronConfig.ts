import Reactotron from 'reactotron-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

Reactotron
  .setAsyncStorageHandler(AsyncStorage)
  .configure({
  name: 'Toro',
    host: 'localhost', // For iOS Simulator
    // host: '192.168.x.x', // Use your computer's IP for physical device
  })
  .useReactNative({
    asyncStorage: true,
    networking: true,
    errors: true,
    overlay: false,
  })
  .connect();

// Capture console.log, console.warn, console.error
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

console.log = (...args) => {
  Reactotron.log?.(...args);
  originalConsoleLog(...args);
};

console.warn = (...args) => {
  Reactotron.warn?.(...args);
  originalConsoleWarn(...args);
};

console.error = (...args) => {
  Reactotron.error?.(...args);
  originalConsoleError(...args);
};

export default Reactotron;
