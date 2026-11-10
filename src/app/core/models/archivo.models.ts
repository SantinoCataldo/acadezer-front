export type TipoArchivo = 'FOTO_PROPIEDAD' | 'IMAGEN';

export interface ArchivoResponse {
  id: number;
  tipo: TipoArchivo;
  nombreOriginal: string;
  contentType: string;
  url: string;
}
