import * as fs from 'fs-extra';
import * as path from 'path';
import {KhaExporter} from './KhaExporter';
import {convert} from '../Converter';
import {executeHaxe} from '../Haxe';
import {Options} from '../Options';
import {exportImage} from '../ImageTool';
const uuid = require('uuid');

export abstract class CSharpExporter extends KhaExporter {
	parameters: Array<string>;
	
	constructor(options: Options) {
		super(options);
		this.addSourceDirectory(path.join(this.options.kha, 'Backends', this.backend()));
		fs.removeSync(path.join(this.options.to, this.sysdir() + '-build', 'Sources'));
	}

	includeFiles(dir: string, baseDir: string) {
		if (!dir || !fs.existsSync(dir)) return;
		let files = fs.readdirSync(dir);
		for (var f in files) {
			let file = path.join(dir, files[f]);
			if (fs.existsSync(file) && fs.statSync(file).isDirectory()) this.includeFiles(file, baseDir);
			else if (file.endsWith(".cs")) {
				this.p("<Compile Include=\"" + path.relative(baseDir, file).replace(/\//g, '\\') + "\" />", 2);
			}
		}
	}

	haxeOptions(name: string, targetOptions: any, defines: Array<string>) {
		defines.push('no-root');
		defines.push('no-compilation');
		defines.push('sys_' + this.options.target);
		defines.push('sys_g1');
		defines.push('sys_g2');
		defines.push('sys_a1');

		return {
			from: this.options.from,
			to: path.join(this.sysdir() + '-build', 'Sources'),
			sources: this.sources,
			libraries: this.libraries,
			defines: defines,
			parameters: this.parameters,
			haxeDirectory: this.options.haxe,
			system: this.sysdir(),
			language: 'cs',
			width: this.width,
			height: this.height,
			name: name
		};
	}

	async export(name: string, targetOptions: any, haxeOptions: any): Promise<void> {
		if (this.projectFiles) {
			const projectUuid: string = uuid.v4();
			this.exportSLN(projectUuid);
			this.exportCsProj(projectUuid);
			this.exportResources();
		}
	}

	exportSLN(projectUuid: string) {
		fs.ensureDirSync(path.join(this.options.to, this.sysdir() + '-build'));
		this.writeFile(path.join(this.options.to, this.sysdir() + '-build', 'Project.sln'));
		const solutionUuid = uuid.v4();

		this.p("Microsoft Visual Studio Solution File, Format Version 11.00");
		this.p("# Visual Studio 2010");
		this.p("Project(\"{" + solutionUuid.toString().toUpperCase() + "}\") = \"HaxeProject\", \"Project.csproj\", \"{" + projectUuid.toString().toUpperCase() + "}\"");
		this.p("EndProject");
		this.p("Global");
		this.p("GlobalSection(SolutionConfigurationPlatforms) = preSolution", 1);
		this.p("Debug|x86 = Debug|x86", 2);
		this.p("Release|x86 = Release|x86", 2);
		this.p("EndGlobalSection", 1);
		this.p("GlobalSection(ProjectConfigurationPlatforms) = postSolution", 1);
		this.p("{" + projectUuid.toString().toUpperCase() + "}.Debug|x86.ActiveCfg = Debug|x86", 2);
		this.p("{" + projectUuid.toString().toUpperCase() + "}.Debug|x86.Build.0 = Debug|x86", 2);
		this.p("{" + projectUuid.toString().toUpperCase() + "}.Release|x86.ActiveCfg = Release|x86", 2);
		this.p("{" + projectUuid.toString().toUpperCase() + "}.Release|x86.Build.0 = Release|x86", 2);
		this.p("EndGlobalSection", 1);
		this.p("GlobalSection(SolutionProperties) = preSolution", 1);
		this.p("HideSolutionNode = FALSE", 2);
		this.p("EndGlobalSection", 1);
		this.p("EndGlobal");
		this.closeFile();
	}

	/*copyMusic(platform, from, to, encoders) {
		return [to];
	}*/
	
	abstract sysdir(): string;
	
	abstract backend(): string;
	
	abstract exportCsProj(projectUuid: string): void;
	
	abstract exportResources(): void;

	async copySound(platform: string, from: string, to: string) {
		return [to];
	}

	async copyImage(platform: string, from: string, to: string, asset: any) {
		let format = await exportImage(this.options.kha, from, path.join(this.options.to, this.sysdir(), to), asset, undefined, false);
		return [to + '.' + format];
	}

	async copyBlob(platform: string, from: string, to: string) {
		fs.copySync(from, path.join(this.options.to, this.sysdir(), to), { clobber: true });
		return [to];
	}

	async copyVideo(platform: string, from: string, to: string) {
		return [to];
	}
}
