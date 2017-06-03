# StockStream Live

Live updating viewer for [StockStream](https://twitch.tv/stockstream)'s portfolio

Instance running at [https://stockstream.abal.moe](https://stockstream.abal.moe)

This is not an official project.

The code kinda sucks, so you probably shouldn't use this as a serious reference.

The websocket server uses a different port than the webserver, but the website
code connects to a websocket on the same port. You probably need a reverse proxy
(Nginx ftw)  or you could edit the website code for dev.
