import {handlerLogin, handlerRegister, handlerDelete, getAllUsers, registerCommand, commandsRegistry, runCommand} from "./config";


async function main(){
	const register: commandsRegistry={};
	registerCommand(register, "login", handlerLogin);
	registerCommand(register, "register", handlerRegister);
	registerCommand(register, "reset", handlerDelete);
	registerCommand(register, "users", getAllUsers);
	
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
