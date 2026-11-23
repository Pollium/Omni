import 'reflect-metadata';
import 'dotenv/config';

import createApp from '@/core/Application';
import PasswordService from '@readable/auth/PasswordService';
import User from '@/modules/user/models/User';

const [email, password] = process.argv.slice(2);

const run = async (): Promise<number> => {
    if(email === undefined || password === undefined){
        console.error('Usage: pnpm set-password <email> <password>');
        return 1;
    }

    const app = createApp();
    await app.build({ queues: false });

    try{
        const user = await User.findOneBy({ email });
        if(user === null){
            console.error(`No user with email ${email}`);
            return 1;
        }

        user.passwordHash = await new PasswordService().hash(password);
        await user.save();
        console.log(`Password set for ${user.username}`);
        return 0;
    }finally{
        await app.stop();
    }
};

process.exitCode = await run();
