import {loginHandler, registerHandler, deleteHandler, getAllUsers, aggregatorHandler, addFeedHandler, printFeedsHandler, followFeedHandler, followingHandler, registerCommand, commandsRegistry, unfollowFeedHandler,browseHandler, runCommand, middlewareLoggedIn} from "./config";

async function main(){
	const register: commandsRegistry={};
	registerCommand(register, "login", loginHandler);
	registerCommand(register, "register", registerHandler);
	registerCommand(register, "reset", deleteHandler);
	registerCommand(register, "users", getAllUsers);
	registerCommand(register, "agg", aggregatorHandler);
	registerCommand(register, "addfeed", middlewareLoggedIn(addFeedHandler));
	registerCommand(register, "feeds", printFeedsHandler);
	registerCommand(register, "follow", middlewareLoggedIn(followFeedHandler));
	registerCommand(register, "following", middlewareLoggedIn(followingHandler));
	registerCommand(register, "unfollow", middlewareLoggedIn(unfollowFeedHandler));
	registerCommand(register, "browse", middlewareLoggedIn(browseHandler));
	
	const args= process.argv.slice(2);
	if(args.length==0){
		throw new Error("Not enough arguments were provided");
	}
	const command=args[0];
	const cmdArgs=args.slice(1);

	await runCommand(register, command, ...cmdArgs);
	process.exit(0);
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
