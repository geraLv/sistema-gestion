import { Router, Request, Response } from "express";
import { ProductoService } from "../services/referenciaService";

const productosRouter = Router();

/**
 * GET /api/productos - Listar todos los productos
 */
productosRouter.get("/", async (req: Request, res: Response) => {
  try {
    const productos = await ProductoService.getAllProductos();

    res.json({
      success: true,
      data: productos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/productos/activos - Obtener solo productos activos
 */
productosRouter.get("/activos", async (req: Request, res: Response) => {
  try {
    const productos = await ProductoService.getProductosActivos();

    res.json({
      success: true,
      data: productos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/productos/search - Buscar productos
 */
productosRouter.get("/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Parámetro 'q' requerido",
      });
    }

    const productos = await ProductoService.buscarProductos(query);

    res.json({
      success: true,
      data: productos,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/productos/:id - Obtener un producto por ID
 */
productosRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const producto = await ProductoService.getProductoById(Number(id));
    if (!producto) {
      return res.status(404).json({
        success: false,
        error: "Producto no encontrado",
      });
    }

    res.json({
      success: true,
      data: producto,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default productosRouter;
