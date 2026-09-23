import fs from "fs";
import os from "os";
import path from "path";
import {createUser, getUser, deleteAllUsers, getUsers} from "../lib/db/queries/users";

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
	if(!await getUser(name)){
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
	
	const existingUser= await getUser(name);
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
