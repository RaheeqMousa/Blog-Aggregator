# Blog-Aggregator
A command-line RSS feed aggregator built with **TypeScript**, **Node.js**, **PostgreSQL**, and **Drizzle ORM**.

Gator lets you create users, add feeds, follow feeds, periodically fetch posts, and browse the latest posts from the feeds you follow.

## Features

- User registration and login
- Add RSS feeds
- Follow and unfollow feeds
- Periodically aggregate RSS feeds
- Browse collected posts with sorting and pagination
- PostgreSQL database persistence

## Tech Stack
- **TypeScript** (application language)
- **Node.js** (runtime)
- **PostgreSQL** (database)
- **Drizzle ORM** (database schema and queries)
- **Fast XML Parser** (RSS/XML parsing)
- **tsx** (TypeScript execution)

## Requirements
Before running this project, make sure you have
- Node.js
- npm
- PostgreSQL

Check existence using:
node --version<br>
npm --version<br>
psql --version

## Installation
### clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/blog-aggregator.git
```

### install dependencies
```bash
npm install
```

### Database setup
1. Run PostgreSQL
```bash
sudo -u postgres psql
```
2. Create the database
```bash
CREATE DATABASE gator;
```
3. Run the Drizzle migrations
npx drizzle-kit migrate

### Configuration
1. Create the file
```bash
~/.gatorconfig.json
```
2. edit the file with
```bash
{
  "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable",
  "current_user_name": ""
}
```
The current_user_name field is updated automatically when you register or log in.

## Project Usage
Gator commands are run through:

```bash
npm run start <command>
```

### reset
deletes all users, feeds, feed follows, and posts from the databse.
```bash
npm run start reset
```
### login
Logs in an existing user and sets them as the current user.
```bash
npm run start login alice
```
### users
prints all registered users, and the current user is marked as (current)
```bash
npm run start login users
```
### agg
Starts the feed aggregator. It periodically fetches RSS feeds and stores new posts.
```bash
npm run start agg 30s
```

Supported duration formats:
```text
10ms
5s
2m
1h
```
Press `Ctrl+C` to stop the aggregator.
### addfeed
Adds a new RSS feed and automatically follows it for the current user.
```bash
npm run start addfeed "Hacker News" https://news.ycombinator.com/rss
```
You can replace the name and URL with any valid RSS feed.
### feeds
Lists all stored RSS feeds.
```bash
npm run start feeds
```
### follow
Follows an existing RSS feed by its URL.
```bash
npm run start follow https://news.ycombinator.com/rss
```
### following
Lists all feeds followed by the current user.
```bash
npm run start following
```
### unfollow
Stops following an RSS feed.
```bash
npm run start unfollow https://news.ycombinator.com/rss
```
### browse
Displays posts from feeds followed by the current user.
By default, it displays the 2 newest posts.
```bash
npm run start -- browse
```

The argument order is:
```text
browse [limit] [page] [--sort newest|oldest]
```
All arguments are optional.

You can specify the number of posts to display:
```bash
npm run start -- browse 10
```

You can also use pagination:
```bash
npm run start -- browse 10 1
npm run start -- browse 10 2
npm run start -- browse 10 3
```
The first argument is the number of posts per page, and the second argument is the page number.

You can sort posts by publication date:
```bash
npm run start -- browse --sort newest
npm run start -- browse --sort oldest
```
The available sort options are `newest` and `oldest`

Sorting can also be combined with the page and limit:
```bash
npm run start -- browse 10 2 --sort newest
npm run start -- browse 10 2 --sort oldest
```
