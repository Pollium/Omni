import { TypesBundle } from '@omni/contracts/types/domain';
import { config } from '@/shared/config';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep, posix } from 'node:path';

export default class TypesService{
    static #bundle: Promise<TypesBundle> | null = null;

    bundle(): Promise<TypesBundle>{
        TypesService.#bundle ??= this.#built();

        return TypesService.#bundle;
    }

    async #built(): Promise<TypesBundle>{
        const entries = await readdir(config.types.source, {
            recursive: true,
            withFileTypes: true
        });
        const paths = entries
            .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
            .map((entry) => relative(config.types.source, join(entry.parentPath, entry.name)).split(sep).join(posix.sep))
            .sort();

        const files: Record<string, string> = {};
        for(const path of paths){
            files[path] = await readFile(join(config.types.source, path), 'utf8');
        }

        const digest = createHash('sha256')
            .update(JSON.stringify(files))
            .digest('hex')
            .slice(0, config.types.digestLength);

        return {
            version: digest,
            files
        };
    }
}
