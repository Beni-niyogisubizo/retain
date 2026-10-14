import { pool } from '../config/db.js';

function readId(value) {
  if (!/^[1-9]\d*$/.test(value)) return null;

  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 4294967295 ? id : null;
}

function readName(body) {
  return typeof body?.name === 'string' ? body.name.trim() : '';
}

export async function listCategories(req, res) {
  const [categories] = await pool.execute(
    'SELECT id, name FROM categories ORDER BY name'
  );

  res.json({ categories });
}

export async function createCategory(req, res) {
  const name = readName(req.body);

  if (!name || name.length > 100) {
    return res.status(400).json({
      message: 'Category name must contain between 1 and 100 characters',
    });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO categories (name) VALUES (?)',
      [name]
    );

    res.status(201).json({ category: { id: result.insertId, name } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Category already exists' });
    }

    throw err;
  }
}

export async function updateCategory(req, res) {
  const id = readId(req.params.id);
  const name = readName(req.body);

  if (!id) {
    return res.status(400).json({ message: 'Invalid category ID' });
  }

  if (!name || name.length > 100) {
    return res.status(400).json({
      message: 'Category name must contain between 1 and 100 characters',
    });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE categories SET name = ? WHERE id = ?',
      [name, id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json({ category: { id, name } });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Category already exists' });
    }

    throw err;
  }
}

export async function deleteCategory(req, res) {
  const id = readId(req.params.id);

  if (!id) {
    return res.status(400).json({ message: 'Invalid category ID' });
  }

  const [result] = await pool.execute(
    'DELETE FROM categories WHERE id = ?',
    [id]
  );

  if (!result.affectedRows) {
    return res.status(404).json({ message: 'Category not found' });
  }

  res.json({ message: 'Category deleted' });
}
