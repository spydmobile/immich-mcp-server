import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { immichApi } from '../immich/client.js';
import { Asset, AssetResponseDto } from '../immich/types.js';
import { logger } from '../utils/logger.js';
import {
  ListAssetsInputSchema,
  GetAssetInputSchema,
  UpdateAssetInputSchema,
  DeleteAssetInputSchema,
  BulkUpdateAssetsInputSchema,
  type ListAssetsInput,
  type GetAssetInput,
  type UpdateAssetInput,
  type DeleteAssetInput,
  type BulkUpdateAssetsInput,
} from '../schemas/mcp-schemas.js';

export class AssetsTool {
  static getTools(): Tool[] {
    return [
      {
        name: 'assets_list',
        description: 'List assets from Immich with pagination and filtering options.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'number',
              minimum: 1,
              default: 1,
              description: 'Page number for pagination',
            },
            size: {
              type: 'number',
              minimum: 1,
              maximum: 1000,
              default: 250,
              description: 'Number of assets per page',
            },
            userId: {
              type: 'string',
              description: 'Filter by user ID',
            },
            isFavorite: {
              type: 'boolean',
              description: 'Filter by favorite status',
            },
            isArchived: {
              type: 'boolean',
              description: 'Filter by archived status',
            },
            withStacked: {
              type: 'boolean',
              description: 'Include stacked assets',
            },
            withPartners: {
              type: 'boolean',
              description: 'Include partner assets',
            },
          },
        },
      },
      {
        name: 'assets_get',
        description: 'Get details of a specific asset by ID.',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: {
              type: 'string',
              description: 'ID of the asset to retrieve',
            },
            key: {
              type: 'string',
              description: 'Optional API key for shared assets',
            },
          },
          required: ['assetId'],
        },
      },
      {
        name: 'assets_update',
        description: 'Update an asset\'s properties like favorite status, archive status, or description.',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: {
              type: 'string',
              description: 'ID of the asset to update',
            },
            isFavorite: {
              type: 'boolean',
              description: 'Set favorite status',
            },
            isArchived: {
              type: 'boolean',
              description: 'Set archived status',
            },
            description: {
              type: 'string',
              description: 'Set asset description',
            },
          },
          required: ['assetId'],
        },
      },
      {
        name: 'assets_delete',
        description: 'Delete an asset from Immich.',
        inputSchema: {
          type: 'object',
          properties: {
            assetId: {
              type: 'string',
              description: 'ID of the asset to delete',
            },
          },
          required: ['assetId'],
        },
      },
      {
        name: 'assets_bulk_update',
        description: 'Update multiple assets at once with the same properties.',
        inputSchema: {
          type: 'object',
          properties: {
            assetIds: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              description: 'Array of asset IDs to update',
            },
            isFavorite: {
              type: 'boolean',
              description: 'Set favorite status for all assets',
            },
            isArchived: {
              type: 'boolean',
              description: 'Set archived status for all assets',
            },
            removeParent: {
              type: 'boolean',
              description: 'Remove parent from stacked assets',
            },
            stackParentId: {
              type: 'string',
              description: 'Set stack parent ID',
            },
          },
          required: ['assetIds'],
        },
      },
      {
        name: 'assets_get_statistics',
        description: 'Get statistics about assets (total count, by type, etc.).',
        inputSchema: {
          type: 'object',
          properties: {
            isArchived: {
              type: 'boolean',
              description: 'Include archived assets in statistics',
            },
            isFavorite: {
              type: 'boolean',
              description: 'Include only favorite assets in statistics',
            },
          },
        },
      },
      {
        name: 'assets_get_random',
        description: 'Get random assets from the library.',
        inputSchema: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 1,
              description: 'Number of random assets to return',
            },
          },
        },
      },
      {
        name: 'assets_upload',
        description: 'Upload one or more files to the Immich library. Optionally add to an album.',
        inputSchema: {
          type: 'object',
          properties: {
            filePaths: {
              type: 'array',
              items: { type: 'string' },
              minItems: 1,
              description: 'Array of file paths to upload (absolute paths)',
            },
            albumId: {
              type: 'string',
              description: 'Optional album ID to add uploaded assets to',
            },
            albumName: {
              type: 'string',
              description: 'Optional album name to add uploaded assets to (creates album if not found)',
            },
          },
          required: ['filePaths'],
        },
      },
    ];
  }

  static async handleTool(name: string, args: any): Promise<any> {
    logger.info(`Executing assets tool: ${name}`, { args });

    try {
      switch (name) {
        case 'assets_list':
          return await this.listAssets(args);
        case 'assets_get':
          return await this.getAsset(args);
        case 'assets_update':
          return await this.updateAsset(args);
        case 'assets_delete':
          return await this.deleteAsset(args);
        case 'assets_bulk_update':
          return await this.bulkUpdateAssets(args);
        case 'assets_get_statistics':
          return await this.getAssetStatistics(args);
        case 'assets_get_random':
          return await this.getRandomAssets(args);
        case 'assets_upload':
          return await this.uploadAssets(args);
        default:
          throw new Error(`Unknown assets tool: ${name}`);
      }
    } catch (error) {
      logger.error(`Error in assets tool ${name}`, error);
      throw error;
    }
  }

  private static async listAssets(args: any): Promise<AssetResponseDto[]> {
    const input = ListAssetsInputSchema.parse(args);
    
    const params: Record<string, any> = {
      page: input.page,
      size: input.size,
    };
    
    if (input.userId) params.userId = input.userId;
    if (input.isFavorite !== undefined) params.isFavorite = input.isFavorite;
    if (input.isArchived !== undefined) params.isArchived = input.isArchived;
    if (input.withStacked !== undefined) params.withStacked = input.withStacked;
    if (input.withPartners !== undefined) params.withPartners = input.withPartners;

    return await immichApi.get<AssetResponseDto[]>('/api/assets', params);
  }

  private static async getAsset(args: any): Promise<AssetResponseDto> {
    const input = GetAssetInputSchema.parse(args);
    
    const params: Record<string, any> = {};
    if (input.key) params.key = input.key;

    return await immichApi.get<AssetResponseDto>(`/api/assets/${input.assetId}`, params);
  }

  private static async updateAsset(args: any): Promise<AssetResponseDto> {
    const input = UpdateAssetInputSchema.parse(args);
    
    const updateData: Record<string, any> = {};
    if (input.isFavorite !== undefined) updateData.isFavorite = input.isFavorite;
    if (input.isArchived !== undefined) updateData.isArchived = input.isArchived;
    if (input.description !== undefined) updateData.description = input.description;

    return await immichApi.put<AssetResponseDto>(`/api/assets/${input.assetId}`, updateData);
  }

  private static async deleteAsset(args: any): Promise<{ success: boolean; message: string }> {
    const input = DeleteAssetInputSchema.parse(args);
    
    await immichApi.delete(`/api/assets/${input.assetId}`);
    
    return {
      success: true,
      message: `Asset ${input.assetId} deleted successfully`,
    };
  }

  private static async bulkUpdateAssets(args: any): Promise<{ success: boolean; message: string; updatedCount: number }> {
    const input = BulkUpdateAssetsInputSchema.parse(args);
    
    const updateData: Record<string, any> = {
      ids: input.assetIds,
    };
    
    if (input.isFavorite !== undefined) updateData.isFavorite = input.isFavorite;
    if (input.isArchived !== undefined) updateData.isArchived = input.isArchived;
    if (input.removeParent !== undefined) updateData.removeParent = input.removeParent;
    if (input.stackParentId) updateData.stackParentId = input.stackParentId;

    await immichApi.put('/api/assets', updateData);
    
    return {
      success: true,
      message: `${input.assetIds.length} assets updated successfully`,
      updatedCount: input.assetIds.length,
    };
  }

  private static async getAssetStatistics(args: any): Promise<any> {
    const params: Record<string, any> = {};
    if (args.isArchived !== undefined) params.isArchived = args.isArchived;
    if (args.isFavorite !== undefined) params.isFavorite = args.isFavorite;

    return await immichApi.get('/api/assets/statistics', params);
  }

  private static async getRandomAssets(args: any): Promise<AssetResponseDto[]> {
    const count = args.count || 1;
    const params = { count };

    return await immichApi.get<AssetResponseDto[]>('/api/assets/random', params);
  }

  private static async uploadAssets(args: any): Promise<{
    success: boolean;
    uploaded: Array<{ filePath: string; assetId: string; status: string }>;
    failed: Array<{ filePath: string; error: string }>;
    albumId?: string;
  }> {
    const { filePaths, albumId, albumName } = args;

    const uploaded: Array<{ filePath: string; assetId: string; status: string }> = [];
    const failed: Array<{ filePath: string; error: string }> = [];

    // Upload each file
    for (const filePath of filePaths) {
      try {
        const result = await immichApi.uploadAsset(filePath);
        uploaded.push({
          filePath,
          assetId: result.id,
          status: result.status || 'created',
        });
        logger.info(`Uploaded asset: ${filePath} -> ${result.id}`);
      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error';
        failed.push({ filePath, error: errorMessage });
        logger.error(`Failed to upload asset: ${filePath}`, error);
      }
    }

    // If album specified and we have uploads, add to album
    let targetAlbumId = albumId;

    if ((albumId || albumName) && uploaded.length > 0) {
      try {
        // If albumName provided but not albumId, find or create the album
        if (!albumId && albumName) {
          // Search for existing album
          const albums = await immichApi.get<any[]>('/api/albums');
          const existingAlbum = albums.find(
            (a: any) => a.albumName.toLowerCase() === albumName.toLowerCase()
          );

          if (existingAlbum) {
            targetAlbumId = existingAlbum.id;
            logger.info(`Found existing album: ${albumName} (${targetAlbumId})`);
          } else {
            // Create new album
            const newAlbum = await immichApi.post('/api/albums', { albumName });
            targetAlbumId = newAlbum.id;
            logger.info(`Created new album: ${albumName} (${targetAlbumId})`);
          }
        }

        // Add assets to album
        const assetIds = uploaded.map((u) => u.assetId);
        await immichApi.put(`/api/albums/${targetAlbumId}/assets`, { ids: assetIds });
        logger.info(`Added ${assetIds.length} assets to album ${targetAlbumId}`);
      } catch (error: any) {
        logger.error(`Failed to add assets to album`, error);
        // Don't fail the whole operation - assets are uploaded, just album add failed
      }
    }

    return {
      success: failed.length === 0,
      uploaded,
      failed,
      albumId: targetAlbumId,
    };
  }
}