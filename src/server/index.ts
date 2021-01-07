import Express from 'express';
import MarkdownIt from 'markdown-it';
import * as fs from 'fs';
import { DEFAULT_CONFIG, FliegdocConfig, Tree } from '../model';
import * as path from 'path';
const origMd = new MarkdownIt({ linkify: true });

const md = {
	render: (md: string) => {
		return origMd.render(md.replaceAll(/{@link (.*?)}/g, '[`$1`](#$1)'));
	}
};

/**
 * Starts an http server on `port` and serves the generated documentation
 *
 * @param tree - the documentation tree
 * @param port - the port on which the documentation gets served
 * @param configOverrides - overrides that get applied to the {@link DEFAULT_CONFIG}
 * @example
 * ```ts
 * import { buildTreeForConfig, serveDynamic } from 'fliegdoc';
 *
 * const tree = buildTreeForConfig(config);
 * serveDynamic(tree, port, configOverrides);
 * ```
 */
export function serveDynamic(
	tree: Tree,
	port: number = 3000,
	configOverrides?: Partial<FliegdocConfig>
): void {
	const finalConfig: FliegdocConfig = {
		...DEFAULT_CONFIG,
		...(configOverrides ?? {})
	};
	const app = Express();

	app.set('views', path.join(__dirname, '..', '..', 'views'));
	app.set('view engine', 'ejs');

	app.get(`${finalConfig.baseUrl}`, (req, res) => {
		res.render('plain', {
			content: md.render(fs.readFileSync(finalConfig.readme).toString()),
			config: finalConfig,
			modules: Object.keys(tree)
		});
	});

	for (const packageName in tree) {
		if (Object.prototype.hasOwnProperty.call(tree, packageName)) {
			app.get(finalConfig.baseUrl + packageName, (req, res) => {
				res.render('module', {
					moduleName: packageName,
					members: tree[packageName],
					md: md,
					config: finalConfig,
					modules: Object.keys(tree)
				});
			});
		}
	}

	app.listen(port, () => {
		console.log(`Listening on http://localhost:${port}${finalConfig.baseUrl}`);
	});
}

/**
 * Starts an HTTP server on `port` and serves the documentation in the config's `outDir`.
 *
 * @param port - the port on which the documentation gets served
 * @param configOverrides - overrides that get applied to the {@link DEFAULT_CONFIG}
 * @example
 * ```ts
 * import { buildTreeForConfig, serveDynamic, buildStatic } from 'fliegdoc';
 *
 * const tree = buildTreeForConfig(config);
 * await buildStatic(tree, config);
 * serveStatic(port, configOverrides);
 * ```
 */
export function serveStatic(
	port: number = 3000,
	configOverrides?: Partial<FliegdocConfig>
): void {
	const finalConfig: FliegdocConfig = {
		...DEFAULT_CONFIG,
		...(configOverrides ?? {})
	};
	const app = Express();
	app.use(finalConfig.baseUrl, Express.static(finalConfig.outDir));

	app.listen(port, () => {
		console.log(`Listening on http://localhost:${port}${finalConfig.baseUrl}`);
	});
}