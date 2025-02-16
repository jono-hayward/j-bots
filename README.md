# J Bots

This is a wholly unofficial and unauthorised recreation of the old TripleJPlays account from the bird site. Triple J stopped maintaining that account in 2021, and I've been missing it ever since. 

Now I'm entirely chuffed to unveil my rebuilt version for Bluesky! It creates a post for every song played on Triple J, just like this old one. But it offers a few improvements over the old version: Better formatting, links to the song streaming services, links to the song lyrics, even album art. _Hot._

## How it works
Every minute, a node script (triggered by a cron job) searches the ABC music API for all tracks played since the last run of the bot. It then searches for each song on streaming services (Apple Music, Spotify and YouTube Music) and looks up the lyrics on Genius, then compiles a Bluesky post with the song's details, artwork and streaming links.

## Tech
- [ATProto API](https://github.com/bluesky-social/atproto)
- [Dotenv](https://github.com/motdotla/dotenv)
- [spotify-web-api-node](https://github.com/thelinmichael/spotify-web-api-node)
- [youtube-music-api](https://github.com/emresenyuva/youtube-music-api)

## Who am I?

I'm just an aging (I think the technical term is _geriatric_) millenial who has aged out of the Triple J demographic but still clings to my love of fresh tunes. Doing my part to keep spreading the love of Aussie music and Australia's greatest radio station.

![](https://media1.tenor.com/m/-u-xaJEqtfEAAAAC/nounsdao-nounish.gif)

## License
[MIT](https://choosealicense.com/licenses/mit/)
