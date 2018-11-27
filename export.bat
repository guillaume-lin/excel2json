@echo off
title [export excel to json]
echo press any key to start.
@pause > nul
echo start exporting...
node app.js --export
echo end export!!!
@pause