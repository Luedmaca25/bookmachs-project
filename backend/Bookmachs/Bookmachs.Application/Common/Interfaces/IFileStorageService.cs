using System.IO;
using System.Threading.Tasks;

namespace Bookmachs.Application.Common.Interfaces;

public interface IFileStorageService
{
    /// <summary>
    /// Guarda un flujo de datos de archivo en el almacenamiento y retorna la URL relativa de acceso.
    /// </summary>
    Task<string> SaveFileAsync(Stream fileStream, string fileName, string folderName);
    
    /// <summary>
    /// Elimina un archivo del almacenamiento basándose en su URL relativa.
    /// </summary>
    void DeleteFile(string fileUrl);
}
