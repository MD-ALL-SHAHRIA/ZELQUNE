import { Config } from '@remotion/cli/config';

// Screens, brand files, music and SFX all live in assets/ (served through staticFile()).
Config.setPublicDir('./assets');
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
