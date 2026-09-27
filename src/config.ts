import fs from "fs";
import os from "os";
import path from "path";
import {createUser, getUserByName, getUserById, deleteAllUsers, getUsers} from "../lib/db/queries/users";
import {createFeed, getFeeds} from "../lib/db/queries/feeds";
const { XMLParser, XMLBuilder, XMLValidator} = require("fast-xml-parser");

export type Config = {
	dbUrl: string;
	currentUserName: string;
};

type CommandHandler= (cmdName:string, ...args: string[]) => Promise<void>;

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

export async function handlerLogin(cmdName: string, ...args: string[]){
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

export async function handlerRegister(cmdName: string, ...args: string[]) {
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

export async function handlerDelete(){
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

export async function handlerAggregator():Promise<void>{
	const feed = await fetchFeed("https://www.wagslane.dev/index.xml");
	console.log(JSON.stringify(feed));
}

function printFeed(feed: Feed, user: User): void {
	console.log(`Feed:\nID: ${feed.id}\nName: ${feed.name}\nURL: ${feed.url}\nUser Id: ${user.id}\n User's Name: ${user.name}`);

}

export async function handlerAddFeed(cmdName: string, ...args: string[]) {
	if (args.length < 2) {
		throw new Error("addfeed command requires a name and URL");
	}

	const name = args[0];
	const url = args[1];

	const config = readConfig();
	const user = await getUserByName(config.currentUserName);

	if (!user) {
		throw new Error("Current user does not exist");
	}

	const feed = await createFeed(name, url, user.id);

	printFeed(feed, user);
}

export async function printFeedsHandler(){
	const feeds= await getFeeds();
	for(let feed of feeds){
		const user= await getUserById(feed.userId);
		printFeed(feed,user);
	}

}
