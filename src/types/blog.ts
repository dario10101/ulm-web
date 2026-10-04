// GET /public/blogs/{username} (ulm-core app/schemas/blog.py). Solo datos
// publicos: el backend no expone nombre, email ni avatar del dueño.
export interface PublicBlog {
  username: string
}
