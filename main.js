const { program } = require('commander');
const { readdir, readFile, writeFile, rm, mkdir, cp } = require('fs/promises')
const path = require('path')
const fm = require('front-matter')
const showdown = require('showdown')
const mustache = require('mustache');
const prettify = require('html-prettify');

const contentFile = "content.md"
const distFolder = "./dist"
const indexHtmlFile = "index.html"
const postTemplateFile = "post.html"
const indexTemplateFile = "index.html"

program
    .option('-p, --posts-folder <string>', 'The path of the post folder', './posts')
    .option('-t, --template-folder <string>', 'The path of the template folder', './templates')
    .option('-b, --build', 'Builds the static site under dist folder');

program.parse(process.argv);

const options = program.opts();

console.log(`posts folder: ${options.postsFolder}`)
console.log(`template folder: ${options.templateFolder}`)
console.log(`is build required: ${options.build ? 'yes' : 'no'}`)


// listPostDirectories lists directories under the post folder
const listPostDirectories = async source =>
    (await readdir(source, { withFileTypes: true }))
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)


const getPosts = async function (folders) {

    const posts = []
    for (const folder of folders) {
        const postPath = path.join(options.postsFolder, folder, contentFile)
        const post = await readFile(postPath, 'utf8').then(data => fm(data))
        //adds folder to use later
        post.sourceFolder = folder
        posts.push(post)
    }

    return posts
}

const copyFiles = async function (post) {

    const source = path.join( options.postsFolder, post.sourceFolder )
    const destination = path.join(distFolder, post.attributes.url)

    const filesToCopy = (await readdir(source, { withFileTypes: true }))
        .filter(dirent => {
            console.log(dirent.name)
            return dirent.isFile() && path.extname(dirent.name).toLowerCase() === ".jpg"
        })
        .map(dirent => dirent.name)

    console.log(filesToCopy)


    console.log(source)
    console.log(destination)
        
    for(const index in filesToCopy){
        await cp( path.join(source, filesToCopy[index]), path.join(destination, filesToCopy[index]) ) 
    }

}

const createPostPages = async function (posts) {

    const converter = new showdown.Converter()

    await rm(distFolder, { recursive: true, force: true })

    const postTemplate = await readFile(path.join(options.templateFolder, postTemplateFile), 'utf8')


    for(let i = 0; i< posts.length; i++){
        const previous = posts[i-1]
        const p = posts[i]
        const next = posts[i+1]

                //TODO: make sure that these exists
        const attributes = p.attributes
        const body = p.body
        const postBody = converter.makeHtml(body);

        const html = prettify(mustache.render(postTemplate, { 
            title: attributes.title, 
            content: postBody,
            previous: previous ? path.join(`..`, previous.attributes.url ) : undefined,
            next: next ? path.join(`..`, next.attributes.url ) : undefined
        }))

        //TODO: if exists??
        //TODO: handle error
        await mkdir(path.join(distFolder, attributes.url), { recursive: true })

        await writeFile(path.join(distFolder, attributes.url, indexHtmlFile), html)

        await copyFiles(p)
    }

    /*
    for (const p of posts) {
        //TODO: make sure that these exists
        const attributes = p.attributes
        const body = p.body
        const postBody = converter.makeHtml(body);

        const html = prettify(mustache.render(postTemplate, { title: attributes.title, content: postBody }))

        //TODO: if exists??
        //TODO: handle error
        await mkdir(path.join(distFolder, attributes.url), { recursive: true })

        await writeFile(path.join(distFolder, attributes.url, indexHtmlFile), html)

        await copyFiles(p)
    }*/

    return posts
}

const createIndexPage = async function (posts) {


    const indexPageTemplate = await readFile(path.join(options.templateFolder, indexTemplateFile), 'utf8')

    const postsAttributes = posts.map(p => p.attributes)

    const html = prettify(mustache.render(indexPageTemplate, { posts: postsAttributes }))

    //TODO: if exists??
    //TODO: handle error
    await mkdir(path.join(distFolder), { recursive: true })

    await writeFile(path.join(distFolder, indexHtmlFile), html)

    return posts
}


listPostDirectories(options.postsFolder)
    .then(folders => getPosts(folders))
    .then(posts => createPostPages(posts))
    .then(posts => createIndexPage(posts))


//.then(posts => posts.forEach(p=>console.log(p)))

