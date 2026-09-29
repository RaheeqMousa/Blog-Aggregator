import fs from "fs";
import os from "os";
import path from "path";
import {createUser, getUserByName, getUserById, deleteAllUsers, getUsers} from "../lib/db/queries/users";
import {createFeed, getFeeds, getFeedByUrl, getNextFeedToFetch, markFeedFetched} from "../lib/db/queries/feeds";
import {createFeedFollow, getFeedFollowsForUser, deleteFeedFollow} from "../lib/db/queries/feedFollows"
import {createPost, getPostsForUser} from "../lib/db/queries/posts"
const { XMLParser, XMLBuilder, XMLValidator} = require("fast-xml-parser");

export type Config = {
	dbUrl: string;
	currentUserName: string;
};

type CommandHandler= (cmdName:string, ...args: string[]) => Promise<void>;

type UserCommandHandler= (cmdName:string, user:User, ...args:string[]) => Promise<void>;

export type CommandsRegistry= Record<string, CommandHandler>

function getConfigFilePath():string{
	return path.join(os.homedir(),".gatorconfig.json");
}

function validateConfig(rawConfig: any): Config{
	if( typeof rawConfig.db_url !=="string"){
		throw new Error("Invalid config: db_url is required");
	}

	// convert the snake_case of rawconfig to camelCase
	return{
		dbUrl: rawConfig.db_url,
		currentUserName: rawConfig.current_user_name ?? ""
	}
}

function writeConfig(cfg: Config):void{
	const configPath= getConfigFilePath();
	
	// Config object attributes are in camelCase, while the json file needs it in snake_case
	const rawConfig={
		db_url: cfg.dbUrl,
		current_user_name: cfg.currentUserName
	}

	fs.writeFileSync(configPath, JSON.stringify(rawConfig))
}

export function readConfig(): Config{
	const configPath= getConfigFilePath();
	const content= fs.readFileSync(configPath, "utf-8");
	
	const configString= JSON.parse(content);
	return validateConfig(configString);
}

export function setUser(cfg:Config, username:string): void{
	cfg.currentUserName= username;
	writeConfig(cfg);
}

export async function loginHandler(cmdName: string, ...args: string[]){
	if(args.length===0){
		throw new Error("The login handler expects a single argument, the username.");
	}
	const name= args[0];
	if(!await getUserByName(name)){
		throw new Error("That account does not exist");
	}
	
	const config= readConfig();
	setUser(config,name);
	console.log("User has been set");
}

export async function registerHandler(cmdName: string, ...args: string[]) {
	if (args.length === 0) {
		throw new Error("register command requires a username");
	}
	const name = args[0];
	
	const existingUser= await getUserByName(name);
	if(existingUser){
		throw new Error(`user ${name} already exists`);
	}
	
	const user=await createUser(name);
	const config= readConfig();
	setUser(config, name);
	console.log(`The user ${name} has been created`);
} 

export function registerCommand(registry: CommandsRegistry, cmdName: string, handler: CommandHandler){

	registry[cmdName]=handler;
}

export async function runCommand(registry: CommandsRegistry, cmdName: string, ...args: string[]){

	const handler=registry[cmdName];
	if(!handler){
		throw new Error(`Invalid Command: ${cmdName}`);
	}
	
	await handler(cmdName, ...args);
}

export async function deleteHandler(){
	await deleteAllUsers();
}

export async function getAllUsers(){
	const users= await getUsers();
	const config= readConfig();
	for(const user of users){
		if(config.currentUserName=== user.name){
			console.log(`* ${user.name} (current)`)
		}else{
			console.log(`* ${user.name}`);
		}
	}
}

type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

async function fetchFeed(feedURL: string): Promise<RSSFeed>{
	try{
		const parser = new XMLParser({
			processEntities: false,
		});
		
		const response= await fetch(feedURL,{
		headers:{
			"User-Agent":"gator",
		}
		});
		
		const xmlResponse= await response.text();
		
		let parsed = parser.parse(xmlResponse);
		if(!parsed.rss|| !parsed.rss.channel){
			throw new Error("Invalid RSS feed: channel not found");
		}
		
		const channel= parsed.rss.channel;
		if(typeof channel.title!=="string" || typeof channel.link!=="string"|| typeof channel.description!=="string"){
			throw new Error("channel metadata are missing");	
		}
		const title= channel.title;
		const link= channel.link;
		const description= channel.description;
		
		const items: RSSItem[]=[];
		
		const channelItems = Array.isArray(channel.item)? channel.item
		  :channel.item? [channel.item]: [];
		  
		for(const item of channelItems){
			if(typeof item.title==="string" && typeof item.link==="string" && typeof item.pubDate==="string" && typeof item.description==="string"){
				items.push(
				{
					title: item.title,
					link: item.link,
					description: item.description,
					pubDate: item.pubDate
				});
			}
				
		}
		
		return {
		channel: {
		    title: title,
		    link: link,
		    description: description,
		    item: items
		  }
		};
	}catch(error){
		throw error;
	}
}

export async function aggregatorHandler(cmdName:string, ...args: string[]):Promise<void>{
	if (args.length !== 1) {
		throw new Error("agg command requires a time_between_reqs argument");
	}

	const timeBetweenRequests = parseDuration(args[0]);

	console.log(`Collecting feeds every ${args[0]}`);

	const handleError = (error: unknown) => {
  		console.error(error);
	};

	scrapeFeeds().catch(handleError);

	const interval = setInterval(() => {
  		scrapeFeeds().catch(handleError);
	}, timeBetweenRequests);
	
	await new Promise<void>((resolve) => {
	  	process.on("SIGINT", () => {
	  		console.log("Shutting down feed aggregator...");
	  		clearInterval(interval);
	  		resolve();
	  	});
	});
}

export function middlewareLoggedIn(handler:UserCommandHandler){
	return async (cmdName: string, ...args: string[]) => {
		const config = readConfig();
    		const user = await getUserByName(config.currentUserName);

    		if (!user) {
      			throw new Error("Current user does not exist");
    		}

    		await handler(cmdName, user, ...args);
  	};
}

function printFeed(feed: Feed, user: User): void {
	console.log(`Feed:\nID: ${feed.id}\nName: ${feed.name}\nURL: ${feed.url}\nUser Id: ${user.id}\nUser's Name: ${user.name}`);

}

export async function addFeedHandler(cmdName: string, user:User, ...args: string[]) {
	if (args.length < 2) {
		throw new Error("addfeed command requires a name and URL");
	}

	const name = args[0];
	const url = args[1];

	const config = readConfig();

	const feed = await createFeed(name, url, user.id);
	const feedFollow= await createFeedFollow(user.id, feed.id);

	console.log(`User ${feedFollow.userName} is now following ${feedFollow.feedName}`,);
}

export async function printFeedsHandler(){
	const feeds= await getFeeds();
	for(let feed of feeds){
		const user= await getUserById(feed.userId);
		printFeed(feed,user);
	}

}

export async function followFeedHandler(cmdName, user:User, ...args: string[]){
	if(args.length!=1){
		throw new Error("The follow command requires a url");
	}
	
	const url = args[0];
	const config= readConfig();
	
	const feed = await getFeedByUrl(url);
	if (!feed) {
		throw new Error("Feed does not exist");
	}

	const feedFollow= await createFeedFollow(user.id, feed.id);
	
	console.log(`User ${user.name} is now following ${feed.name}`)
}

export async function followingHandler(cmdName, user:User, ...args: string[]){
	const config= readConfig();
	
	const follows= await getFeedFollowsForUser(user.id);
	console.log(`User ${user.name} is following:`);
	
	for (const follow of follows) {
		console.log(`* ${follow.feedName}`);
	}
}

export async function unfollowFeedHandler(cmdName:string, user:User, ...args:string[]){
	if (args.length !== 1) {
    		throw new Error("The unfollow command requires a url");
  	}

  	const url = args[0];

  	await deleteFeedFollow(user.id, url);

  	console.log(`User ${user.name} has unfollowed ${url}`);
}

export async function scrapeFeeds(){
	const feed = await getNextFeedToFetch();

	if (!feed) {
		throw new Error("No feeds available");
	}

  	console.log(`Fetching feed: ${feed.name}`);

  	const rssFeed = await fetchFeed(feed.url);

	await markFeedFetched(feed.id);

	for (const item of rssFeed.channel.item) {
		const publishedAt= new Date(item.pubDate);
		
		await createPost(
			item.title,
			item.link,
			item.description,
			publishedAt,
			feed.id,
		);
  	}
}

function parseDuration(durationStr: string):number{
	const regex= /^(\d+)(ms|s|m|h)$/;
	const match= durationStr.match(regex);
	
	if(!match){
		throw new Error("Invalid duration format");
	}
	
	const amount = Number(match[1]);
	const unit = match[2];

	switch (unit) {
		case "ms":
 			return amount;
 		case "s":
      			return amount * 1000;
    		case "m":
			return amount * 60 * 1000;
		case "h":
			return amount * 60 * 60 * 1000;
		default:
			throw new Error("Invalid duration unit");
	}

}

export async function browseHandler(cmdName, user:User, ...args:string[]): Promise<void>{
	let limit=2;
	
	if(args.length>1){
		throw new Error("Browse command needs just one argument");
	}
	
	if (args.length === 1) {
		limit = Number(args[0]);

		if (!Number.isInteger(limit) || limit <= 0) {
			throw new Error("limit must be a positive integer");
		}
    }
	
	const posts= await getPostsForUser(user.id, limit);
	
	for(const post of posts){
		console.log(`Title: ${post.title}`);
		console.log(`URL: ${post.url}`);
		console.log(`Published: ${post.publishedAt}`);
		console.log(`Description: ${post.description}`);
		console.log();
	}
}
