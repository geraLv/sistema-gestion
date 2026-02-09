import { Router, Request, Response } from "express";
import { VendedorService } from "../services/referenciaService";

const vendedoresRouter = Router();

/**
 * GET /api/vendedores - Listar todos los vendedores
 */
vendedoresRouter.get("/", async (req: Request, res: Response) => {
  try {
    const vendedores = await VendedorService.getAllVendedores();

    res.json({
      success: true,
      data: vendedores,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/vendedores/activos - Obtener solo vendedores activos
 */
vendedoresRouter.get("/activos", async (req: Request, res: Response) => {
  try {
    const vendedores = await VendedorService.getVendedoresActivos();

    res.json({
      success: true,
      data: vendedores,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/vendedores/search - Buscar vendedores
 */
vendedoresRouter.get("/search", async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Parámetro 'q' requerido",
      });
    }

    const vendedores = await VendedorService.buscarVendedores(query);

    res.json({
      success: true,
      data: vendedores,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * GET /api/vendedores/:id - Obtener un vendedor por ID
 */
vendedoresRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const vendedor = await VendedorService.getVendedorById(Number(id));
    if (!vendedor) {
      return res.status(404).json({
        success: false,
        error: "Vendedor no encontrado",
      });
    }

    res.json({
      success: true,
      data: vendedor,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default vendedoresRouter;
