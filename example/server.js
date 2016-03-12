import Koapi from '../src/koapi';
import config from './config/development';

var app  = new Koapi();

app.run(config);
